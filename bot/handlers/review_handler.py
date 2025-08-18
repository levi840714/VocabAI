from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from bot.database.sqlite_db import get_word_to_review, update_word_review_status, get_word_by_id
from bot.core.spaced_repetition import calculate_next_review_date
from bot.services.ai_service import AIService

router = Router()

class ReviewStates(StatesGroup):
    reviewing_word = State()
    showing_explanation = State()
    showing_deep_explanation = State()

async def send_review_card(message: Message, db_path: str, user_id: int, state: FSMContext):
    word_data = await get_word_to_review(db_path, user_id)

    if not word_data:
        user_data = await state.get_data()
        reviewed_count = user_data.get('reviewed_count', 0)
        if reviewed_count > 0:
            await message.answer(f"🎉 Congratulations! You've completed your review session. You reviewed {reviewed_count} words today!")
        else:
            await message.answer("🎉 You have no words to review for today! Keep adding new words to expand your vocabulary.")
        await state.clear()
        return

    await state.update_data(current_word_id=word_data['id'])

    builder = InlineKeyboardBuilder()
    builder.button(text="Show Explanation", callback_data=f"show_explanation:{word_data['id']}")
    builder.button(text="Skip", callback_data=f"skip_word:{word_data['id']}")
    builder.adjust(1)
    
    await message.answer(f"Review this word: <b>{word_data['word']}</b>", reply_markup=builder.as_markup())
    await state.set_state(ReviewStates.reviewing_word)


@router.callback_query(F.data.startswith("show_explanation:"), ReviewStates.reviewing_word)
async def show_explanation_handler(callback_query: CallbackQuery, state: FSMContext, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("This word is no longer due for review.", show_alert=True)
        return

    builder = InlineKeyboardBuilder()
    builder.button(text="Easy", callback_data=f"review_response:easy:{word_id}")
    builder.button(text="Hard", callback_data=f"review_response:hard:{word_id}")
    builder.button(text="Again", callback_data=f"review_response:again:{word_id}")
    builder.button(text="Deep Learning", callback_data=f"deep_learning:{word_id}")
    builder.adjust(3, 1)

    await callback_query.message.edit_text(
        f"<b>{word_data['word']}</b>\n\n{word_data['initial_ai_explanation']}",
        reply_markup=builder.as_markup()
    )
    await state.set_state(ReviewStates.showing_explanation)

@router.callback_query(F.data.startswith("review_response:"), ReviewStates.showing_explanation)
async def process_review_response_handler(callback_query: CallbackQuery, state: FSMContext, config: dict):
    _, response, word_id_str = callback_query.data.split(":")
    word_id = int(word_id_str)
    db_path = config['database']['db_path']
    user_id = callback_query.from_user.id

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("Error processing review. Please try again.", show_alert=True)
        return

    new_interval, new_difficulty, next_review_date = calculate_next_review_date(
        word_data['interval'], word_data['difficulty'], response
    )

    await update_word_review_status(db_path, word_id, user_id, new_interval, new_difficulty, next_review_date)
    
    user_data = await state.get_data()
    reviewed_count = user_data.get('reviewed_count', 0) + 1
    await state.update_data(reviewed_count=reviewed_count)

    await callback_query.answer(f"Got it! Next review in {new_interval} day(s).")

    # Send the next card
    await send_review_card(callback_query.message, db_path, user_id, state)

@router.callback_query(F.data.startswith("deep_learning:"), ReviewStates.showing_explanation)
async def deep_learning_handler(callback_query: CallbackQuery, ai_service: AIService, state: FSMContext, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("Could not retrieve word details.", show_alert=True)
        return

    await callback_query.answer("正在獲取深度學習資訊...")

    raw_deep_explanation = await ai_service.get_deep_learning_explanation(word_data['word'])
    structured_deep_data = ai_service.parse_structured_response(raw_deep_explanation, is_deep_learning=True)
    
    # Import the formatting function from word_handler
    from bot.handlers.word_handler import format_deep_learning_explanation
    formatted_deep_explanation = format_deep_learning_explanation(structured_deep_data)

    new_text = f"<b>{word_data['word']}</b>\n\n<b>🔍 深度學習內容:</b>\n{formatted_deep_explanation}"

    builder = InlineKeyboardBuilder()
    builder.button(text="Back to Review", callback_data=f"show_explanation:{word_id}")
    builder.adjust(1)

    await callback_query.message.edit_text(new_text, reply_markup=builder.as_markup())
    await state.set_state(ReviewStates.showing_deep_explanation)

@router.callback_query(F.data.startswith("skip_word:"), ReviewStates.reviewing_word)
async def skip_word_handler(callback_query: CallbackQuery, state: FSMContext, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']
    user_id = callback_query.from_user.id

    await callback_query.answer("Word skipped.")
    user_data = await state.get_data()
    reviewed_count = user_data.get('reviewed_count', 0) + 1
    await state.update_data(reviewed_count=reviewed_count)
    await send_review_card(callback_query.message, db_path, user_id, state)

@router.callback_query(F.data.startswith("back_to_review:"), ReviewStates.showing_deep_explanation)
async def back_to_review_handler(callback_query: CallbackQuery, state: FSMContext, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("Could not retrieve word details.", show_alert=True)
        return

    builder = InlineKeyboardBuilder()
    builder.button(text="Easy", callback_data=f"review_response:easy:{word_id}")
    builder.button(text="Hard", callback_data=f"review_response:hard:{word_id}")
    builder.button(text="Again", callback_data=f"review_response:again:{word_id}")
    builder.button(text="Deep Learning", callback_data=f"deep_learning:{word_id}")
    builder.adjust(3, 1)

    await callback_query.message.edit_text(
        f"<b>{word_data['word']}</b>\n\n{word_data['initial_ai_explanation']}",
        reply_markup=builder.as_markup()
    )
    await state.set_state(ReviewStates.showing_explanation)
