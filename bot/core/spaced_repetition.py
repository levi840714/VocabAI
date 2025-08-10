from datetime import datetime, timedelta

def calculate_next_review_date(interval: int, difficulty: int, response: str) -> tuple[int, int, str]:
    """
    Calculates the next review date based on the user's response.

    Args:
        interval: The current interval in days.
        difficulty: The current difficulty score.
        response: The user's response ('easy', 'hard', 'again', 'mastered').

    Returns:
        A tuple containing the new interval, new difficulty, and the next review date.
    """
    if response == 'easy':
        new_interval = min(interval * 2, 365)  # Double the interval, max 1 year
        new_difficulty = max(0, difficulty - 1)
    elif response == 'hard':
        new_interval = max(1, interval // 2)  # Halve the interval, min 1 day
        new_difficulty = min(10, difficulty + 1)
    elif response == 'mastered':
        new_interval = 365  # Set to 1 years for mastered words
        new_difficulty = 0
    else:  # 'again'
        new_interval = 0 # Set interval to 0 for immediate review
        new_difficulty = min(10, difficulty + 2)

    next_review_date = (datetime.now() + timedelta(days=new_interval)).strftime('%Y-%m-%d')
    return new_interval, new_difficulty, next_review_date
