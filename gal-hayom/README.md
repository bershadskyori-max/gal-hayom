# גל היום

אפליקציית מצב גלים לחופי ישראל. היא רצה בחינם על GitHub Pages, ורובוט ב-GitHub Actions מעדכן את הנתונים.

- **תחזית:** מתעדכנת כל 3 שעות מ-Open-Meteo, בלי AI.
- **דיווחי גולשים וסיכום:** Gemini מחפש בגוגל ומסכם, פעמיים ביום (6:00 ו-14:00).

## הקמה (פעם אחת)

1. פותחים חשבון ב-[GitHub](https://github.com/signup).
2. יוצרים מאגר חדש (New repository) בשם `gal-hayom`, מסוג **Public**.
3. בעמוד המאגר לוחצים על **uploading an existing file**, גוררים את כל הקבצים והתיקיות מהתיקייה הזו ולוחצים **Commit changes**.
   התיקייה `.github` מוסתרת ב-Finder (מקישים ⌘⇧. כדי לראות אותה). אם היא לא עלתה, יוצרים קובץ דרך **Add file ← Create new file** בשם `.github/workflows/update.yml` ומדביקים לתוכו את התוכן של הקובץ.
4. לוקחים מפתח חינמי ל-Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey), ואז **Create API key**.
5. במאגר הולכים ל-**Settings ← Secrets and variables ← Actions ← New repository secret**.
   שם: `GEMINI_API_KEY`. ערך: המפתח מהשלב הקודם.
6. **Settings ← Pages**: בוחרים Source = **Deploy from a branch**, ענף `main`, תיקייה `/ (root)`, ושומרים.
7. **Actions**: מאשרים את הרובוט, נכנסים ל"עדכון נתונים" ולוחצים **Run workflow**.

האפליקציה תהיה זמינה בכתובת `https://<שם-המשתמש>.github.io/gal-hayom/`. בטלפון אפשר להוסיף אותה למסך הבית.

## סרטונים אמיתיים מיוטיוב (מומלץ)

1. נכנסים ל-[console.cloud.google.com](https://console.cloud.google.com) עם חשבון גוגל ויוצרים פרויקט חדש (למשל `gal-hayom`).
2. בחיפוש למעלה כותבים **YouTube Data API v3**, נכנסים ולוחצים **Enable**.
3. בתפריט הולכים ל-**APIs & Services ← Credentials ← Create credentials ← API key** ומעתיקים את המפתח.
4. במאגר ב-GitHub: **Settings ← Secrets and variables ← Actions ← New repository secret**.
   שם: `YOUTUBE_API_KEY`. ערך: המפתח.

מהריצה הבאה של הרובוט יופיעו בכל חוף סרטונים מהיומיים האחרונים. כשאין סרטונים, כתוב שאין.

## דיווחי גולשים מתוך האפליקציה

1. נרשמים בחינם ל-[supabase.com](https://supabase.com) ויוצרים פרויקט חדש (**New project**).
2. בפרויקט נכנסים ל-**SQL Editor**, מדביקים את הקוד הבא ולוחצים **Run**:

```sql
create table reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  beach int,
  beach_name text not null check (char_length(beach_name) <= 60),
  rating int not null check (rating between 1 and 5),
  size text default '' check (char_length(size) <= 20),
  text text default '' check (char_length(text) <= 200)
);
alter table reports enable row level security;
create policy "anyone can read" on reports for select using (true);
create policy "anyone can add" on reports for insert with check (true);
```

3. נכנסים ל-**Project Settings ← API** ומעתיקים שני דברים: **Project URL**, והמפתח **anon public**.
4. בקובץ `config.js` מדביקים אותם בין המירכאות, ומעלים את הקובץ למאגר.

הכפתור "הייתי במים, אני מדווח" יופיע לבד. המפתח הזה ציבורי ובטוח לפרסום, כי הוא מאפשר רק לקרוא דיווחים ולהוסיף חדשים.

## הערות

- הנתונים נשמרים בתיקייה `data/`, והרובוט מעדכן אותם לבד.
- חוף חדש מוסיפים רק בסוף הרשימה ב-`scripts/update.rb`, ומוסיפים לו גם כיוון ב-`FACES`.
- אפשר להחליף את המודל של Gemini דרך **Settings ← Variables**, במשתנה `GEMINI_MODEL`.
- אחרי 60 יום בלי שום פעילות, GitHub עוצר רובוטים מתוזמנים. העדכונים שהרובוט עצמו שומר נחשבים פעילות.
