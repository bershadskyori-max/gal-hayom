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

## הערות

- הנתונים נשמרים בתיקייה `data/`, והרובוט מעדכן אותם לבד.
- אפשר להחליף את המודל של Gemini דרך **Settings ← Variables**, במשתנה `GEMINI_MODEL`.
- אחרי 60 יום בלי שום פעילות, GitHub עוצר רובוטים מתוזמנים. העדכונים שהרובוט עצמו שומר נחשבים פעילות.
