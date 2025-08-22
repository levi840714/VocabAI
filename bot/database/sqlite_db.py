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
            
        # Add category column if it doesn't exist (for word categorization)
        try:
            await db.execute("ALTER TABLE words ADD COLUMN category TEXT DEFAULT 'uncategorized'")
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
        
        # Daily Discovery 收藏功能相關表格 - 完整存儲內容
        await db.execute("""
        CREATE TABLE IF NOT EXISTS daily_discovery_bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            discovery_id INTEGER NOT NULL,
            bookmark_type TEXT NOT NULL DEFAULT 'full',
            knowledge_point_id TEXT NULL,
            personal_notes TEXT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, discovery_id, bookmark_type, knowledge_point_id)
        )
        """)
        
        # 添加新欄位以支援完整內容存儲（資料庫遷移）
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN content_date DATE")
        except aiosqlite.OperationalError:
            pass  # 欄位已存在
            
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN article_title TEXT")
        except aiosqlite.OperationalError:
            pass
            
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN article_content TEXT")
        except aiosqlite.OperationalError:
            pass
            
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN knowledge_points TEXT")
        except aiosqlite.OperationalError:
            pass
            
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN learning_objectives TEXT")
        except aiosqlite.OperationalError:
            pass
            
        try:
            await db.execute("ALTER TABLE daily_discovery_bookmarks ADD COLUMN discussion_questions TEXT")
        except aiosqlite.OperationalError:
            pass
        
        await db.execute("""
        CREATE TABLE IF NOT EXISTS bookmark_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tag_name TEXT NOT NULL,
            tag_color TEXT DEFAULT '#3B82F6',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, tag_name)
        )
        """)
        
        await db.execute("""
        CREATE TABLE IF NOT EXISTS bookmark_tag_relations (
            bookmark_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            FOREIGN KEY (bookmark_id) REFERENCES daily_discovery_bookmarks (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES bookmark_tags (id) ON DELETE CASCADE,
            PRIMARY KEY (bookmark_id, tag_id)
        )
        """)
        
        # Word categories table for user-defined categories
        await db.execute("""
        CREATE TABLE IF NOT EXISTS word_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_name TEXT NOT NULL,
            color_code TEXT DEFAULT '#3B82F6',
            is_default BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category_name)
        )
        """)
        
        await db.commit()
    logging.info("Database initialized.")

async def add_word(db_path, user_id, word, initial_ai_explanation, chinese_meaning, user_notes=None, category='uncategorized'):
    """Adds a new word to the database for a given user."""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO words (user_id, word, initial_ai_explanation, chinese_meaning, user_notes, next_review, category)
            VALUES (?, ?, ?, ?, ?, date('now', '-1 day'), ?)
            """, (user_id, word, initial_ai_explanation, chinese_meaning, user_notes, category))
            await db.commit()
            logging.info(f"Word '{word}' added for user {user_id} with category '{category}'. next_review set to: {date.today()}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"Word '{word}' already exists for user {user_id}.")
            return False

async def get_words_for_user(db_path, user_id, page=0, page_size=5, search_term=None, category_filter=None):
    """Retrieves a paginated list of words for a given user with optional filtering."""
    offset = page * page_size
    
    # Build WHERE clause with filters
    where_conditions = ["user_id = ?"]
    params = [user_id]
    
    # Add search filter
    if search_term:
        where_conditions.append("(word LIKE ? OR initial_ai_explanation LIKE ? OR chinese_meaning LIKE ? OR user_notes LIKE ?)")
        search_pattern = f"%{search_term}%"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
    
    # Add category filter
    if category_filter:
        if category_filter == 'uncategorized':
            where_conditions.append("(category IS NULL OR category = 'uncategorized')")
        else:
            where_conditions.append("category = ?")
            params.append(category_filter)
    
    where_clause = " AND ".join(where_conditions)
    
    async with aiosqlite.connect(db_path) as db:
        # Get filtered words
        query = f"""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, interval, difficulty, next_review, created_at, category FROM words
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """
        params.extend([page_size, offset])
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        # Convert rows to dictionaries
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 'interval', 'difficulty', 'next_review', 'created_at', 'category']
        words = [dict(zip(columns, row)) for row in rows]
        
        # Get total count with same filters (excluding LIMIT/OFFSET)
        count_query = f"SELECT COUNT(*) FROM words WHERE {where_clause}"
        count_params = params[:-2]  # Remove page_size and offset
        cursor = await db.execute(count_query, count_params)
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

async def update_word_review_status(db_path, word_id, user_id, new_interval, new_difficulty, next_review_date, response=None):
    """Updates the review status of a word."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            UPDATE words
            SET interval = ?, difficulty = ?, next_review = ?
            WHERE id = ? AND user_id = ?
            """,
            (new_interval, new_difficulty, next_review_date, word_id, user_id),
        )
        
        # Insert into learning history with the actual response
        if response:
            await db.execute("""
            INSERT INTO learning_history (word_id, response)
            VALUES (?, ?)
            """, (word_id, response))
        
        await db.commit()
    logging.info(f"Word {word_id} review status updated for user {user_id}. Next review: {next_review_date}")

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
        SELECT id, user_id, word, initial_ai_explanation, user_notes, next_review, interval, difficulty, created_at, chinese_meaning, category
        FROM words WHERE id = ?
        """, (word_id,))
        row = await cursor.fetchone()
        
        if row:
            columns = ['id', 'user_id', 'word', 'initial_ai_explanation', 'user_notes', 'next_review', 'interval', 'difficulty', 'created_at', 'chinese_meaning', 'category']
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

async def update_word_notes(db_path, word_id, user_id, user_notes):
    """Updates the user notes for a word, scoped by user_id."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            """
            UPDATE words
            SET user_notes = ?
            WHERE id = ? AND user_id = ?
            """,
            (user_notes, word_id, user_id),
        )
        await db.commit()
        if cursor.rowcount == 0:
            logging.warning(f"No rows updated for word {word_id} and user {user_id} (notes unchanged or not owned)")
            return False
    logging.info(f"Word {word_id} user notes updated for user {user_id}.")
    return True

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
        
        # Delete the word (scoped by user)
        await db.execute("DELETE FROM words WHERE id = ? AND user_id = ?", (word_id, user_id))
        
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

# Daily Discovery 收藏功能 CRUD 操作
async def add_bookmark(db_path, user_id, discovery_id, bookmark_type='full', knowledge_point_id=None, personal_notes=None):
    """添加收藏 - 完整存儲探索內容"""
    import json
    async with aiosqlite.connect(db_path) as db:
        try:
            # 獲取完整的原始探索內容
            cursor = await db.execute("""
            SELECT content_date, article_title, article_content, knowledge_points, created_at, expires_at
            FROM daily_discovery
            WHERE id = ?
            """, (discovery_id,))
            discovery_row = await cursor.fetchone()
            
            if not discovery_row:
                logging.error(f"找不到探索內容 ID: {discovery_id}")
                return False
            
            content_date, article_title, article_content, knowledge_points_json, created_at, expires_at = discovery_row
            
            # 解析完整的知識點JSON（包含文章詳情、學習目標、討論問題等）
            try:
                parsed_data = json.loads(knowledge_points_json) if knowledge_points_json else {}
            except (json.JSONDecodeError, TypeError):
                parsed_data = {}
                logging.warning(f"無法解析探索內容 {discovery_id} 的知識點數據")
            
            # 提取學習目標和討論問題
            learning_objectives = json.dumps(parsed_data.get('learning_objectives', []), ensure_ascii=False)
            discussion_questions = json.dumps(parsed_data.get('discussion_questions', []), ensure_ascii=False)
            
            # 插入收藏並完整存儲所有內容
            await db.execute("""
            INSERT INTO daily_discovery_bookmarks (
                user_id, discovery_id, bookmark_type, knowledge_point_id, personal_notes,
                content_date, article_title, article_content, knowledge_points,
                learning_objectives, discussion_questions
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, discovery_id, bookmark_type, knowledge_point_id, personal_notes,
                content_date, article_title, article_content, knowledge_points_json,
                learning_objectives, discussion_questions
            ))
            await db.commit()
            logging.info(f"用戶 {user_id} 收藏了探索內容 {discovery_id} (類型: {bookmark_type}) - 完整內容已保存")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"用戶 {user_id} 已經收藏過此內容")
            return False

async def remove_bookmark(db_path, user_id, discovery_id, bookmark_type='full', knowledge_point_id=None):
    """移除收藏"""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        DELETE FROM daily_discovery_bookmarks 
        WHERE user_id = ? AND discovery_id = ? AND bookmark_type = ? 
        AND (knowledge_point_id = ? OR (knowledge_point_id IS NULL AND ? IS NULL))
        """, (user_id, discovery_id, bookmark_type, knowledge_point_id, knowledge_point_id))
        await db.commit()
        logging.info(f"用戶 {user_id} 移除了探索內容 {discovery_id} 的收藏")

async def get_user_bookmarks(db_path, user_id, bookmark_type=None, page=0, page_size=20):
    """獲取用戶的收藏列表 - 直接從收藏表讀取完整內容"""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        if bookmark_type:
            cursor = await db.execute("""
            SELECT id, discovery_id, bookmark_type, knowledge_point_id, personal_notes, created_at,
                   content_date, article_title, article_content, knowledge_points,
                   learning_objectives, discussion_questions
            FROM daily_discovery_bookmarks
            WHERE user_id = ? AND bookmark_type = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """, (user_id, bookmark_type, page_size, offset))
        else:
            cursor = await db.execute("""
            SELECT id, discovery_id, bookmark_type, knowledge_point_id, personal_notes, created_at,
                   content_date, article_title, article_content, knowledge_points,
                   learning_objectives, discussion_questions
            FROM daily_discovery_bookmarks
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """, (user_id, page_size, offset))
        
        rows = await cursor.fetchall()
        bookmarks = []
        
        for row in rows:
            # 處理新舊數據兼容性：檢查是否有完整的收藏表內容
            has_complete_data = (len(row) >= 12 and 
                               row[6] is not None and 
                               row[7] is not None and 
                               row[8] is not None)
            
            if has_complete_data:
                # 新格式：直接從收藏表讀取完整內容
                bookmark = {
                    'id': row[0],
                    'discovery_id': row[1],
                    'bookmark_type': row[2],
                    'knowledge_point_id': row[3],
                    'personal_notes': row[4],
                    'created_at': row[5],
                    'discovery': {
                        'content_date': row[6],
                        'article_title': row[7],
                        'article_content': row[8],
                        'knowledge_points': row[9] or '[]',
                        'learning_objectives': row[10] or '[]',
                        'discussion_questions': row[11] or '[]'
                    }
                }
            else:
                # 舊格式：需要從原始表獲取內容（向後兼容）
                discovery_cursor = await db.execute("""
                SELECT content_date, article_title, article_content, knowledge_points
                FROM daily_discovery
                WHERE id = ?
                """, (row[1],))  # discovery_id
                discovery_row = await discovery_cursor.fetchone()
                
                if discovery_row:
                    bookmark = {
                        'id': row[0],
                        'discovery_id': row[1],
                        'bookmark_type': row[2],
                        'knowledge_point_id': row[3],
                        'personal_notes': row[4],
                        'created_at': row[5],
                        'discovery': {
                            'content_date': discovery_row[0],
                            'article_title': discovery_row[1],
                            'article_content': discovery_row[2],
                            'knowledge_points': discovery_row[3],
                            'learning_objectives': '[]',
                            'discussion_questions': '[]'
                        }
                    }
                else:
                    # 原始內容已過期，但我們還是記錄這個收藏（可能需要特殊處理）
                    bookmark = {
                        'id': row[0],
                        'discovery_id': row[1],
                        'bookmark_type': row[2],
                        'knowledge_point_id': row[3],
                        'personal_notes': row[4],
                        'created_at': row[5],
                        'discovery': {
                            'content_date': '2025-01-01',  # 默認日期
                            'article_title': '內容已過期',
                            'article_content': '此收藏的原始內容已過期或不可用。',
                            'knowledge_points': '[]',
                            'learning_objectives': '[]',
                            'discussion_questions': '[]'
                        }
                    }
            
            # 解析知識點 JSON
            try:
                import json
                bookmark['discovery']['knowledge_points'] = json.loads(bookmark['discovery']['knowledge_points'])
            except (json.JSONDecodeError, TypeError):
                bookmark['discovery']['knowledge_points'] = []
                
            bookmarks.append(bookmark)
        
        # 獲取總數
        if bookmark_type:
            count_cursor = await db.execute("""
            SELECT COUNT(*) FROM daily_discovery_bookmarks 
            WHERE user_id = ? AND bookmark_type = ?
            """, (user_id, bookmark_type))
        else:
            count_cursor = await db.execute("""
            SELECT COUNT(*) FROM daily_discovery_bookmarks 
            WHERE user_id = ?
            """, (user_id,))
        
        total_count = (await count_cursor.fetchone())[0]
        
        return bookmarks, total_count

async def get_user_bookmarks_summary(db_path, user_id, bookmark_type=None, page=0, page_size=20):
    """獲取用戶收藏列表的簡化版本 - 只返回基本資訊，不包含完整內容"""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        if bookmark_type:
            cursor = await db.execute("""
            SELECT id, discovery_id, bookmark_type, knowledge_point_id, personal_notes, created_at,
                   content_date, article_title
            FROM daily_discovery_bookmarks
            WHERE user_id = ? AND bookmark_type = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """, (user_id, bookmark_type, page_size, offset))
        else:
            cursor = await db.execute("""
            SELECT id, discovery_id, bookmark_type, knowledge_point_id, personal_notes, created_at,
                   content_date, article_title
            FROM daily_discovery_bookmarks
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """, (user_id, page_size, offset))
        
        rows = await cursor.fetchall()
        bookmarks = []
        
        for row in rows:
            # 檢查是否有基本資訊
            has_basic_data = (len(row) >= 8 and row[6] is not None and row[7] is not None)
            
            if has_basic_data:
                # 從收藏表讀取基本資訊
                # 提取內容類型：如果 content_date 包含類型（如 "2025-08-16_conversation"），則提取類型
                content_date_parts = row[6].split('_') if row[6] else ['', '']
                content_date = content_date_parts[0]
                content_type = content_date_parts[1] if len(content_date_parts) > 1 else 'article'
                
                bookmark = {
                    'id': row[0],
                    'discovery_id': row[1],
                    'bookmark_type': row[2],
                    'knowledge_point_id': row[3],
                    'personal_notes': row[4],
                    'created_at': row[5],
                    'content_date': content_date,
                    'article_title': row[7],
                    'content_type': content_type
                }
            else:
                # 向後兼容：從原始表獲取基本資訊
                discovery_cursor = await db.execute("""
                SELECT content_date, article_title
                FROM daily_discovery
                WHERE id = ?
                """, (row[1],))  # discovery_id
                discovery_row = await discovery_cursor.fetchone()
                
                if discovery_row:
                    # 提取內容類型：如果 content_date 包含類型，則提取類型
                    content_date_parts = discovery_row[0].split('_') if discovery_row[0] else ['', '']
                    content_date = content_date_parts[0]
                    content_type = content_date_parts[1] if len(content_date_parts) > 1 else 'article'
                    
                    bookmark = {
                        'id': row[0],
                        'discovery_id': row[1],
                        'bookmark_type': row[2],
                        'knowledge_point_id': row[3],
                        'personal_notes': row[4],
                        'created_at': row[5],
                        'content_date': content_date,
                        'article_title': discovery_row[1],
                        'content_type': content_type
                    }
                else:
                    # 如果原始內容不存在，跳過這個收藏
                    continue
            
            bookmarks.append(bookmark)
        
        # 獲取總數
        if bookmark_type:
            count_cursor = await db.execute("""
            SELECT COUNT(*) FROM daily_discovery_bookmarks 
            WHERE user_id = ? AND bookmark_type = ?
            """, (user_id, bookmark_type))
        else:
            count_cursor = await db.execute("""
            SELECT COUNT(*) FROM daily_discovery_bookmarks 
            WHERE user_id = ?
            """, (user_id,))
        
        total_count = (await count_cursor.fetchone())[0]
        
        return bookmarks, total_count

async def get_bookmark_detail(db_path, bookmark_id, user_id):
    """獲取特定收藏的完整詳細內容"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, discovery_id, bookmark_type, knowledge_point_id, personal_notes, created_at,
               content_date, article_title, article_content, knowledge_points,
               learning_objectives, discussion_questions
        FROM daily_discovery_bookmarks
        WHERE id = ? AND user_id = ?
        """, (bookmark_id, user_id))
        
        row = await cursor.fetchone()
        if not row:
            return None
            
        # 檢查是否有完整資料
        has_complete_data = (len(row) >= 12 and 
                           row[6] is not None and 
                           row[7] is not None and 
                           row[8] is not None)
        
        if has_complete_data:
            # 從收藏表讀取完整內容
            bookmark = {
                'id': row[0],
                'discovery_id': row[1],
                'bookmark_type': row[2],
                'knowledge_point_id': row[3],
                'personal_notes': row[4],
                'created_at': row[5],
                'discovery': {
                    'content_date': row[6].split('_')[0] if '_' in row[6] else row[6],
                    'article_title': row[7],
                    'article_content': row[8],
                    'knowledge_points': row[9] or '[]',
                    'learning_objectives': row[10] or '[]',
                    'discussion_questions': row[11] or '[]'
                }
            }
        else:
            # 向後兼容：從原始表獲取內容
            discovery_cursor = await db.execute("""
            SELECT content_date, article_title, article_content, knowledge_points
            FROM daily_discovery
            WHERE id = ?
            """, (row[1],))  # discovery_id
            discovery_row = await discovery_cursor.fetchone()
            
            if discovery_row:
                bookmark = {
                    'id': row[0],
                    'discovery_id': row[1],
                    'bookmark_type': row[2],
                    'knowledge_point_id': row[3],
                    'personal_notes': row[4],
                    'created_at': row[5],
                    'discovery': {
                        'content_date': discovery_row[0].split('_')[0] if '_' in discovery_row[0] else discovery_row[0],
                        'article_title': discovery_row[1],
                        'article_content': discovery_row[2],
                        'knowledge_points': discovery_row[3] or '[]',
                        'learning_objectives': '[]',
                        'discussion_questions': '[]'
                    }
                }
            else:
                return None
                
        return bookmark

async def is_bookmarked(db_path, user_id, discovery_id, bookmark_type='full', knowledge_point_id=None):
    """檢查是否已收藏"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id FROM daily_discovery_bookmarks 
        WHERE user_id = ? AND discovery_id = ? AND bookmark_type = ? 
        AND (knowledge_point_id = ? OR (knowledge_point_id IS NULL AND ? IS NULL))
        """, (user_id, discovery_id, bookmark_type, knowledge_point_id, knowledge_point_id))
        row = await cursor.fetchone()
        return row is not None

async def update_bookmark_notes(db_path, bookmark_id, user_id, personal_notes):
    """更新收藏筆記"""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
        UPDATE daily_discovery_bookmarks 
        SET personal_notes = ? 
        WHERE id = ? AND user_id = ?
        """, (personal_notes, bookmark_id, user_id))
        await db.commit()
        
# 標籤管理功能
async def create_bookmark_tag(db_path, user_id, tag_name, tag_color='#3B82F6'):
    """創建收藏標籤"""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO bookmark_tags (user_id, tag_name, tag_color)
            VALUES (?, ?, ?)
            """, (user_id, tag_name, tag_color))
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False

# Word Categories CRUD functions
async def create_default_categories(db_path, user_id):
    """Create default word categories for a new user."""
    default_categories = [
        ('學術', '#8B5CF6', True),   # Academic
        ('商務', '#3B82F6', True),   # Business  
        ('日常', '#10B981', True),   # Daily
        ('科技', '#F59E0B', True),   # Technology
        ('文藝', '#EF4444', True),   # Literature/Arts
        ('醫療', '#06B6D4', True),   # Medical
        ('旅遊', '#84CC16', True),   # Travel
        ('未分類', '#6B7280', True)  # Uncategorized
    ]
    
    async with aiosqlite.connect(db_path) as db:
        for category_name, color_code, is_default in default_categories:
            try:
                await db.execute("""
                INSERT INTO word_categories (user_id, category_name, color_code, is_default)
                VALUES (?, ?, ?, ?)
                """, (user_id, category_name, color_code, is_default))
            except aiosqlite.IntegrityError:
                # Category already exists for this user
                continue
        await db.commit()
        logging.info(f"Default categories created for user {user_id}")

async def get_user_categories(db_path, user_id):
    """Get all categories for a user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, category_name, color_code, is_default, created_at
        FROM word_categories
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at ASC
        """, (user_id,))
        rows = await cursor.fetchall()
        
        categories = []
        for row in rows:
            categories.append({
                'id': row[0],
                'category_name': row[1], 
                'color_code': row[2],
                'is_default': bool(row[3]),
                'created_at': row[4]
            })
        return categories

async def create_user_category(db_path, user_id, category_name, color_code='#3B82F6'):
    """Create a custom category for a user."""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO word_categories (user_id, category_name, color_code, is_default)
            VALUES (?, ?, ?, 0)
            """, (user_id, category_name, color_code))
            await db.commit()
            logging.info(f"Custom category '{category_name}' created for user {user_id}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"Category '{category_name}' already exists for user {user_id}")
            return False

async def update_word_category(db_path, word_id, user_id, category):
    """Update the category of a word."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        UPDATE words
        SET category = ?
        WHERE id = ? AND user_id = ?
        """, (category, word_id, user_id))
        await db.commit()
        
        if cursor.rowcount > 0:
            logging.info(f"Word {word_id} category updated to '{category}' for user {user_id}")
            return True
        else:
            logging.warning(f"Failed to update category for word {word_id} and user {user_id}")
            return False

async def get_words_by_category(db_path, user_id, category, page=0, page_size=20):
    """Get words filtered by category."""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, 
               interval, difficulty, next_review, created_at, category
        FROM words
        WHERE user_id = ? AND category = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """, (user_id, category, page_size, offset))
        rows = await cursor.fetchall()
        
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 
                  'interval', 'difficulty', 'next_review', 'created_at', 'category']
        words = [dict(zip(columns, row)) for row in rows]
        
        # Get total count
        cursor = await db.execute("""
        SELECT COUNT(*) FROM words WHERE user_id = ? AND category = ?
        """, (user_id, category))
        total_count = (await cursor.fetchone())[0]
        
        return words, total_count

async def get_category_stats(db_path, user_id):
    """Get word count statistics by category."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT category, COUNT(*) as count
        FROM words
        WHERE user_id = ?
        GROUP BY category
        ORDER BY count DESC
        """, (user_id,))
        rows = await cursor.fetchall()
        
        return {row[0]: row[1] for row in rows}

async def get_user_bookmark_tags(db_path, user_id):
    """獲取用戶的標籤列表"""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, tag_name, tag_color, created_at
        FROM bookmark_tags
        WHERE user_id = ?
        ORDER BY created_at DESC
        """, (user_id,))
        rows = await cursor.fetchall()
        
        return [{'id': row[0], 'tag_name': row[1], 'tag_color': row[2], 'created_at': row[3]} for row in rows]

async def add_bookmark_tag_relation(db_path, bookmark_id, tag_id):
    """為收藏添加標籤"""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO bookmark_tag_relations (bookmark_id, tag_id)
            VALUES (?, ?)
            """, (bookmark_id, tag_id))
            await db.commit()
            return True
        except aiosqlite.IntegrityError:
            return False

# Word Categories CRUD functions
async def create_default_categories(db_path, user_id):
    """Create default word categories for a new user."""
    default_categories = [
        ('學術', '#8B5CF6', True),   # Academic
        ('商務', '#3B82F6', True),   # Business  
        ('日常', '#10B981', True),   # Daily
        ('科技', '#F59E0B', True),   # Technology
        ('文藝', '#EF4444', True),   # Literature/Arts
        ('醫療', '#06B6D4', True),   # Medical
        ('旅遊', '#84CC16', True),   # Travel
        ('未分類', '#6B7280', True)  # Uncategorized
    ]
    
    async with aiosqlite.connect(db_path) as db:
        for category_name, color_code, is_default in default_categories:
            try:
                await db.execute("""
                INSERT INTO word_categories (user_id, category_name, color_code, is_default)
                VALUES (?, ?, ?, ?)
                """, (user_id, category_name, color_code, is_default))
            except aiosqlite.IntegrityError:
                # Category already exists for this user
                continue
        await db.commit()
        logging.info(f"Default categories created for user {user_id}")

async def get_user_categories(db_path, user_id):
    """Get all categories for a user."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, category_name, color_code, is_default, created_at
        FROM word_categories
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at ASC
        """, (user_id,))
        rows = await cursor.fetchall()
        
        categories = []
        for row in rows:
            categories.append({
                'id': row[0],
                'category_name': row[1], 
                'color_code': row[2],
                'is_default': bool(row[3]),
                'created_at': row[4]
            })
        return categories

async def create_user_category(db_path, user_id, category_name, color_code='#3B82F6'):
    """Create a custom category for a user."""
    async with aiosqlite.connect(db_path) as db:
        try:
            await db.execute("""
            INSERT INTO word_categories (user_id, category_name, color_code, is_default)
            VALUES (?, ?, ?, 0)
            """, (user_id, category_name, color_code))
            await db.commit()
            logging.info(f"Custom category '{category_name}' created for user {user_id}")
            return True
        except aiosqlite.IntegrityError:
            logging.warning(f"Category '{category_name}' already exists for user {user_id}")
            return False

async def update_word_category(db_path, word_id, user_id, category):
    """Update the category of a word."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        UPDATE words
        SET category = ?
        WHERE id = ? AND user_id = ?
        """, (category, word_id, user_id))
        await db.commit()
        
        if cursor.rowcount > 0:
            logging.info(f"Word {word_id} category updated to '{category}' for user {user_id}")
            return True
        else:
            logging.warning(f"Failed to update category for word {word_id} and user {user_id}")
            return False

async def get_words_by_category(db_path, user_id, category, page=0, page_size=20):
    """Get words filtered by category."""
    offset = page * page_size
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT id, word, initial_ai_explanation, chinese_meaning, user_notes, 
               interval, difficulty, next_review, created_at, category
        FROM words
        WHERE user_id = ? AND category = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """, (user_id, category, page_size, offset))
        rows = await cursor.fetchall()
        
        columns = ['id', 'word', 'initial_ai_explanation', 'chinese_meaning', 'user_notes', 
                  'interval', 'difficulty', 'next_review', 'created_at', 'category']
        words = [dict(zip(columns, row)) for row in rows]
        
        # Get total count
        cursor = await db.execute("""
        SELECT COUNT(*) FROM words WHERE user_id = ? AND category = ?
        """, (user_id, category))
        total_count = (await cursor.fetchone())[0]
        
        return words, total_count

async def get_category_stats(db_path, user_id):
    """Get word count statistics by category."""
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
        SELECT category, COUNT(*) as count
        FROM words
        WHERE user_id = ?
        GROUP BY category
        ORDER BY count DESC
        """, (user_id,))
        rows = await cursor.fetchall()
        
        return {row[0]: row[1] for row in rows}
