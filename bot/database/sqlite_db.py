import aiosqlite
import logging
from datetime import date

async def init_db(db_path):
    """Initializes the database and creates tables if they don't exist."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            initial_ai_explanation TEXT,
            chinese_meaning TEXT,
            user_notes TEXT,
            next_review TEXT,
            interval INTEGER DEFAULT 1,
            difficulty INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, word)
        )
        """)
        
        # Add chinese_meaning column if it doesn't exist (for existing databases)
        try:
            await db.execute("ALTER TABLE words ADD COLUMN chinese_meaning TEXT")
        except aiosqlite.OperationalError:
            # Column already exists
            pass
        await db.execute("""
        CREATE TABLE IF NOT EXISTS learning_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER NOT NULL,
            response TEXT NOT NULL,
            review_date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (word_id) REFERENCES words (id)
        )
        """)
        
        await db.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            learning_preferences TEXT NOT NULL,
            interface_settings TEXT NOT NULL,
            ai_settings TEXT NOT NULL,
            study_settings TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        await db.execute("""
        CREATE TABLE IF NOT EXISTS daily_discovery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_date DATE UNIQUE NOT NULL,
            article_title TEXT NOT NULL,
            article_content TEXT NOT NULL,
            knowledge_points TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL
        )
        """)
        
        await db.commit()
    logging.info("Database initialized.")

async def add_word(db_path, user_id, word, initial_ai_explanation, chinese_meaning, user_notes=None):
    """Adds a new word to the database for a given user."""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO words (user_id, word, initial_ai_explanation, chinese_meaning, user_notes, next_review)
            VALUES (?, ?, ?, ?, ?, date('now', '-1 day'))
            """, (user_id, word, initial_ai_explanation, chinese_meaning, user_notes))
            await db.commit()
            logging.info(f"Word '{word}' added for user {user_id}. next_review set to: {date.today()}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"Word '{word}' already exists for user {user_id}.")
            return False

async def get_words_for_user(db_path, user_id, page=0, page_size=5):
    """Retrieves a paginated list of words for a given user."""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, interval, difficulty, next_review, created_at FROM words
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """, (user_id, page_size, offset))
        rows = await cursor.fetchall()
        
        # Convert rows to dictionaries
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 'interval', 'difficulty', 'next_review', 'created_at']
        words = [dict(zip(columns, row)) for row in rows]
        
        cursor = await db.execute("SELECT COUNT(*) FROM words WHERE user_id = ?", (user_id,))
        total_count = (await cursor.fetchone())[0]
        
        return words, total_count

async def get_word_to_review(db_path, user_id):
    """Retrieves a single word that is due for review for a given user."""
    async with aiosqlite.connect(db_path) as db:
        logging.info(f"Attempting to get word for review for user {user_id}. Current date: {date.today()}")
        cursor = await db.execute("""
        SELECT id, user_id, word, initial_ai_explanation, chinese_meaning, user_notes, next_review, interval, difficulty, created_at
        FROM words
        WHERE user_id = ? AND next_review <= date('now')
        ORDER BY next_review
        LIMIT 1
        """, (user_id,))
        row = await cursor.fetchone()
        
        if row:
            columns = ['id', 'user_id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 'next_review', 'interval', 'difficulty', 'created_at']
            word = dict(zip(columns, row))
        else:
            word = None
            
        logging.info(f"get_word_to_review result for user {user_id}: {word}")
        return word

async def update_word_review_status(db_path, word_id, new_interval, new_difficulty, next_review_date, response=None):
    """Updates the review status of a word."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        UPDATE words
        SET interval = ?, difficulty = ?, next_review = ?
        WHERE id = ?
        """, (new_interval, new_difficulty, next_review_date, word_id))
        
        # Insert into learning history with the actual response
        if response:
            await db.execute("""
            INSERT INTO learning_history (word_id, response)
            VALUES (?, ?)
            """, (word_id, response))
        
        await db.commit()
    logging.info(f"Word {word_id} review status updated. Next review: {next_review_date}")

async def get_all_user_ids(db_path):
    """Retrieves all unique user IDs from the database."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("SELECT DISTINCT user_id FROM words")
        rows = await cursor.fetchall()
        return [row[0] for row in rows]

async def get_word_by_id(db_path, word_id):
    """Retrieves a single word by its ID."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, user_id, word, initial_ai_explanation, user_notes, next_review, interval, difficulty, created_at, chinese_meaning 
        FROM words WHERE id = ?
        """, (word_id,))
        row = await cursor.fetchone()
        
        if row:
            columns = ['id', 'user_id', 'word', 'initial_ai_explanation', 'user_notes', 'next_review', 'interval', 'difficulty', 'created_at', 'chinese_meaning']
            word = dict(zip(columns, row))
        else:
            word = None
        return word

async def get_word_by_word(db_path, user_id, word):
    """Retrieves a single word by its word string and user ID."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, user_id, word, initial_ai_explanation, user_notes, next_review, interval, difficulty, created_at, chinese_meaning 
        FROM words WHERE user_id = ? AND word = ?
        """, (user_id, word))
        row = await cursor.fetchone()
        
        if row:
            columns = ['id', 'user_id', 'word', 'initial_ai_explanation', 'user_notes', 'next_review', 'interval', 'difficulty', 'created_at', 'chinese_meaning']
            word_data = dict(zip(columns, row))
        else:
            word_data = None
        return word_data

async def get_words_due_for_review(db_path, user_id, page=0, page_size=5):
    """Retrieves a paginated list of words due for review today for a given user."""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        logging.info(f"Attempting to get words due for review for user {user_id}. Current date: {date.today()}")
        cursor = await db.execute("""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, interval, difficulty FROM words
        WHERE user_id = ? AND next_review <= date('now')
        ORDER BY next_review ASC
        LIMIT ? OFFSET ?
        """, (user_id, page_size, offset))
        rows = await cursor.fetchall()
        
        # Convert rows to dictionaries
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 'interval', 'difficulty']
        words = [dict(zip(columns, row)) for row in rows]
        
        logging.info(f"get_words_due_for_review result for user {user_id}: {words}")
        
        cursor = await db.execute("SELECT COUNT(*) FROM words WHERE user_id = ? AND next_review <= date('now')", (user_id,))
        total_count = (await cursor.fetchone())[0]
        
        return words, total_count

async def get_recently_added_words(db_path, user_id, page=0, page_size=5):
    """Retrieves a paginated list of recently added words for a given user."""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, interval, difficulty FROM words
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """, (user_id, page_size, offset))
        rows = await cursor.fetchall()
        
        # Convert rows to dictionaries
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 'interval', 'difficulty']
        words = [dict(zip(columns, row)) for row in rows]
        
        cursor = await db.execute("SELECT COUNT(*) FROM words WHERE user_id = ?", (user_id,))
        total_count = (await cursor.fetchone())[0]
        
        return words, total_count

async def get_total_words_count(db_path, user_id):
    """Retrieves the total number of words for a given user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM words WHERE user_id = ?", (user_id,))
        total_count = (await cursor.fetchone())[0]
        return total_count

async def get_reviewed_words_count_today(db_path, user_id):
    """Retrieves the number of words reviewed today for a given user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT COUNT(DISTINCT word_id) FROM learning_history lh
        JOIN words w ON lh.word_id = w.id
        WHERE w.user_id = ? AND lh.review_date >= date('now')
        """, (user_id,))
        reviewed_count = (await cursor.fetchone())[0]
        return reviewed_count

async def get_due_words_count_today(db_path, user_id):
    """Retrieves the number of words due for review today for a given user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT COUNT(*) FROM words
        WHERE user_id = ? AND next_review <= date('now')
        """, (user_id,))
        due_count = (await cursor.fetchone())[0]
        return due_count

async def get_word_difficulty_distribution(db_path, user_id):
    """Retrieves the distribution of words by difficulty for a given user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT difficulty, COUNT(*) as count FROM words
        WHERE user_id = ?
        GROUP BY difficulty
        ORDER BY difficulty
        """, (user_id,))
        rows = await cursor.fetchall()
        return {row[0]: row[1] for row in rows}

async def update_word_notes(db_path, word_id, user_notes):
    """Updates the user notes for a word."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        UPDATE words
        SET user_notes = ?
        WHERE id = ?
        """, (user_notes, word_id))
        await db.commit()
    logging.info(f"Word {word_id} user notes updated.")

async def delete_word(db_path, word_id, user_id):
    """Deletes a word and its associated learning history."""
    async with aiosqlite.connect(db_path) as db:
        # First verify the word belongs to the user
        cursor = await db.execute("SELECT id FROM words WHERE id = ? AND user_id = ?", (word_id, user_id))
        word = await cursor.fetchone()
        if not word:
            return False
        
        # Delete learning history first (foreign key constraint)
        await db.execute("DELETE FROM learning_history WHERE word_id = ?", (word_id,))
        
        # Delete the word
        await db.execute("DELETE FROM words WHERE id = ?", (word_id,))
        
        await db.commit()
    logging.info(f"Word {word_id} deleted for user {user_id}")
    return True

async def mark_word_as_learned(db_path, word_id, user_id):
    """Marks a word as learned by setting it to mastered status with a long review interval."""
    async with aiosqlite.connect(db_path) as db:
        # First verify the word belongs to the user
        cursor = await db.execute("SELECT id FROM words WHERE id = ? AND user_id = ?", (word_id, user_id))
        word = await cursor.fetchone()
        if not word:
            return False
        
        # Set the word as mastered: difficulty 0, interval 365 days, next review in 1 year
        from datetime import datetime, timedelta
        next_review_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        await db.execute("""
        UPDATE words
        SET interval = 365, difficulty = 0, next_review = ?
        WHERE id = ?
        """, (next_review_date, word_id))
        
        # Add to learning history
        await db.execute("""
        INSERT INTO learning_history (word_id, response)
        VALUES (?, 'mastered')
        """, (word_id,))
        
        await db.commit()
    logging.info(f"Word {word_id} marked as learned for user {user_id}")
    return True

async def reset_word_learning_status(db_path, word_id, user_id):
    """Resets a word's learning status back to active learning (makes it due for review)."""
    async with aiosqlite.connect(db_path) as db:
        # First verify the word belongs to the user
        cursor = await db.execute("SELECT id FROM words WHERE id = ? AND user_id = ?", (word_id, user_id))
        word = await cursor.fetchone()
        if not word:
            return False
        
        # Reset to learning state: difficulty 2 (moderate), interval 1 day, next review tomorrow
        from datetime import datetime, timedelta
        next_review_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        await db.execute("""
        UPDATE words
        SET interval = 1, difficulty = 2, next_review = ?
        WHERE id = ?
        """, (next_review_date, word_id))
        
        # Add to learning history
        await db.execute("""
        INSERT INTO learning_history (word_id, response)
        VALUES (?, 'reset')
        """, (word_id,))
        
        await db.commit()
    logging.info(f"Word {word_id} learning status reset for user {user_id}")
    return True

def is_word_learned(word_data):
    """Check if a word is considered 'learned' based on its spaced repetition parameters."""
    # A word is considered learned if it has a long interval (>= 30 days) and low difficulty (0-1)
    if word_data and 'interval' in word_data and 'difficulty' in word_data:
        return word_data['interval'] >= 30 and word_data['difficulty'] <= 1
    return False

# User Settings CRUD functions
async def get_user_settings(db_path, user_id):
    """Get user settings for a specific user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT user_id, learning_preferences, interface_settings, ai_settings, study_settings, created_at, updated_at
        FROM user_settings
        WHERE user_id = ?
        """, (user_id,))
        row = await cursor.fetchone()
        
        if row:
            import json
            columns = ['user_id', 'learning_preferences', 'interface_settings', 'ai_settings', 'study_settings', 'created_at', 'updated_at']
            settings_dict = dict(zip(columns, row))
            
            # 解析 JSON 字符串為字典
            try:
                settings_dict['learning_preferences'] = json.loads(settings_dict['learning_preferences']) if settings_dict['learning_preferences'] else {}
                settings_dict['interface_settings'] = json.loads(settings_dict['interface_settings']) if settings_dict['interface_settings'] else {}
                settings_dict['ai_settings'] = json.loads(settings_dict['ai_settings']) if settings_dict['ai_settings'] else {}
                settings_dict['study_settings'] = json.loads(settings_dict['study_settings']) if settings_dict['study_settings'] else {}
            except (json.JSONDecodeError, TypeError) as e:
                logging.warning(f"解析用戶 {user_id} 設定 JSON 失敗: {e}")
                # 如果解析失敗，設為空字典
                settings_dict['learning_preferences'] = {}
                settings_dict['interface_settings'] = {}
                settings_dict['ai_settings'] = {}
                settings_dict['study_settings'] = {}
            
            return settings_dict
        return None

async def create_user_settings(db_path, user_id, learning_preferences, interface_settings, ai_settings, study_settings):
    """Create new user settings."""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO user_settings (user_id, learning_preferences, interface_settings, ai_settings, study_settings)
            VALUES (?, ?, ?, ?, ?)
            """, (user_id, learning_preferences, interface_settings, ai_settings, study_settings))
            await db.commit()
            logging.info(f"User settings created for user {user_id}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"User settings already exist for user {user_id}")
            return False

async def update_user_settings(db_path, user_id, learning_preferences=None, interface_settings=None, ai_settings=None, study_settings=None):
    """Update user settings."""
    async with aiosqlite.connect(db_path) as db:
        # Build update query dynamically based on provided parameters
        update_fields = []
        params = []
        
        if learning_preferences is not None:
            update_fields.append("learning_preferences = ?")
            params.append(learning_preferences)
        
        if interface_settings is not None:
            update_fields.append("interface_settings = ?")
            params.append(interface_settings)
            
        if ai_settings is not None:
            update_fields.append("ai_settings = ?")
            params.append(ai_settings)
            
        if study_settings is not None:
            update_fields.append("study_settings = ?")
            params.append(study_settings)
        
        if not update_fields:
            return False
            
        # Always update updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        query = f"""
        UPDATE user_settings 
        SET {', '.join(update_fields)}
        WHERE user_id = ?
        """
        
        cursor = await db.execute(query, params)
        await db.commit()
        
        if cursor.rowcount > 0:
            logging.info(f"User settings updated for user {user_id}")
            return True
        else:
            logging.warning(f"No user settings found for user {user_id}")
            return False

async def upsert_user_settings(db_path, user_id, learning_preferences, interface_settings, ai_settings, study_settings):
    """Create or update user settings (upsert)."""
    existing_settings = await get_user_settings(db_path, user_id)
    
    if existing_settings:
        return await update_user_settings(
            db_path, user_id, 
            learning_preferences, interface_settings, 
            ai_settings, study_settings
        )
    else:
        return await create_user_settings(
            db_path, user_id, 
            learning_preferences, interface_settings, 
            ai_settings, study_settings
        )

async def get_all_users_with_reminders(db_path):
    """獲取所有啟用提醒功能的用戶設定"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT user_id, learning_preferences, interface_settings, ai_settings, study_settings
        FROM user_settings
        """)
        rows = await cursor.fetchall()
        
        users_with_reminders = []
        if rows:
            import json
            for row in rows:
                user_id, learning_prefs, interface_settings, ai_settings, study_settings = row
                try:
                    # 解析 JSON 字串
                    learning_preferences = json.loads(learning_prefs) if learning_prefs else {}
                    
                    # 檢查是否啟用提醒
                    if learning_preferences.get('review_reminder_enabled', False):
                        reminder_time = learning_preferences.get('review_reminder_time', '09:00')
                        users_with_reminders.append({
                            'user_id': user_id,
                            'reminder_time': reminder_time,
                            'learning_preferences': learning_preferences
                        })
                except (json.JSONDecodeError, KeyError) as e:
                    logging.warning(f"解析用戶 {user_id} 設定失敗: {e}")
                    continue
        
        return users_with_reminders

# Daily Discovery CRUD functions
async def get_daily_discovery(db_path, date_str):
    """獲取指定日期的每日探索內容"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, content_date, article_title, article_content, knowledge_points, created_at, expires_at
        FROM daily_discovery
        WHERE content_date = ?
        """, (date_str,))
        row = await cursor.fetchone()
        
        if row:
            columns = ['id', 'content_date', 'article_title', 'article_content', 'knowledge_points', 'created_at', 'expires_at']
            discovery_data = dict(zip(columns, row))
            
            # 解析 JSON 知識點
            try:
                import json
                discovery_data['knowledge_points'] = json.loads(discovery_data['knowledge_points'])
            except (json.JSONDecodeError, TypeError) as e:
                logging.warning(f"解析每日探索知識點 JSON 失敗: {e}")
                discovery_data['knowledge_points'] = []
            
            return discovery_data
        return None

async def create_daily_discovery(db_path, date_str, article_title, article_content, knowledge_points):
    """創建每日探索內容"""
    from datetime import datetime, timedelta
    import json
    
    # 設定過期時間為明天同一時間
    expires_at = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
    knowledge_points_json = json.dumps(knowledge_points, ensure_ascii=False)
    
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO daily_discovery (content_date, article_title, article_content, knowledge_points, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """, (date_str, article_title, article_content, knowledge_points_json, expires_at))
            await db.commit()
            logging.info(f"每日探索內容已創建: {date_str}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"日期 {date_str} 的每日探索內容已存在")
            return False

async def cleanup_expired_daily_discovery(db_path):
    """清理過期的每日探索內容"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        DELETE FROM daily_discovery
        WHERE expires_at <= datetime('now')
        """)
        deleted_count = cursor.rowcount
        await db.commit()
        
        if deleted_count > 0:
            logging.info(f"清理了 {deleted_count} 條過期的每日探索內容")
        
        return deleted_count