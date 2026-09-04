/**
 * מאגר תבניות ואלגוריתמי בגרות מובנים
 * בית ספר מקיף דוד טוביהו - מגמת מדעי המחשב
 */

const PRESETS = [
    {
        id: "count",
        title: "1. ספירת איברים בתור (שימור מלא)",
        difficulty: "בסיסי",
        initialQueue: [14, 7, 25, 9, 31],
        description: "אלגוריתם תקני לספירת מספר האיברים בתור באמצעות תור עזר temp, תוך שימור התור המקורי בסיום לפי כלל הברזל בבגרות.",
        code: `public static int Count(Queue<int> q)
{
    Queue<int> temp = new Queue<int>();
    int count = 0;

    // שלב 1: ריקון התור וספירת האיברים
    while (!q.IsEmpty())
    {
        count++;
        int val = q.Remove();
        temp.Insert(val); // שמירה בתור עזר
    }

    // שלב 2: שחזור התור המקורי במלואו
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    return count;
}`
    },
    {
        id: "sum_average",
        title: "2. חישוב סכום וממוצע איברים בתור",
        difficulty: "בסיסי+",
        initialQueue: [10, 20, 30, 40, 50],
        description: "חישוב סכום וממוצע של איברי התור תוך שימוש במשתנה צובר (sum) ושחזור התור באמצעות תור עזר.",
        code: `public static double Average(Queue<int> q)
{
    Queue<int> temp = new Queue<int>();
    int sum = 0;
    int count = 0;

    while (!q.IsEmpty())
    {
        int x = q.Remove();
        sum += x;
        count++;
        temp.Insert(x);
    }

    // שחזור התור
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    if (count == 0)
    {
        return 0;
    }

    return sum / count;
}`
    },
    {
        id: "contains",
        title: "3. חיפוש ערך מסוים בתור (Contains)",
        difficulty: "בינוני",
        initialQueue: [5, 12, 88, 43, 19],
        description: "בדיקה האם הערך המבוקש (למשל 88) קיים בתור. שים לב: ממשיכים לסרוק עד הסוף כדי לשמר את התור במלואו!",
        code: `public static bool Contains(Queue<int> q, int target)
{
    Queue<int> temp = new Queue<int>();
    bool found = false;

    while (!q.IsEmpty())
    {
        int current = q.Remove();
        if (current == target)
        {
            found = true;
        }
        temp.Insert(current);
    }

    // שחזור התור המקורי
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    return found;
}

public static void Main(Queue<int> q)
{
    bool exists = Contains(q, 88);
}`
    },
    {
        id: "split_even_odd",
        title: "4. פיצול תור לזוגיים ואי-זוגיים",
        difficulty: "בינוני",
        initialQueue: [11, 4, 18, 7, 22, 13],
        description: "פירוק התור לשני תורים נפרדים: evens למספרים זוגיים ו-odds למספרים אי-זוגיים.",
        code: `public static void SplitEvenOdd(Queue<int> q)
{
    Queue<int> evens = new Queue<int>();
    Queue<int> odds = new Queue<int>();

    while (!q.IsEmpty())
    {
        int val = q.Remove();
        if (val % 2 == 0)
        {
            evens.Insert(val);
        }
        else
        {
            odds.Insert(val);
        }
    }
}`
    },
    {
        id: "is_sorted",
        title: "5. בדיקה האם התור ממוין בסדר עולה",
        difficulty: "מתקדם",
        initialQueue: [3, 9, 15, 24, 40],
        description: "בדיקה האם איברי התור ממוינים בסדר עולה ממש. בכל פסיעה משווים את האיבר הנוכחי מול הקודם.",
        code: `public static bool IsSorted(Queue<int> q)
{
    Queue<int> temp = new Queue<int>();
    bool sorted = true;

    if (q.IsEmpty())
    {
        return true;
    }

    int prev = q.Remove();
    temp.Insert(prev);

    while (!q.IsEmpty())
    {
        int curr = q.Remove();
        if (curr < prev)
        {
            sorted = false;
        }
        prev = curr;
        temp.Insert(curr);
    }

    // שחזור התור המקורי
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    return sorted;
}`
    },
    {
        id: "helper_functions",
        title: "6. פונקציית עזר לשכפול תור (Clone & Nested Call)",
        difficulty: "מתקדם",
        initialQueue: [2, 4, 6, 8],
        description: "הדגמה של פונקציית עזר CloneQueue המשכפלת תור, ופונקציית Main הקוראת לה ומשתמשת במחסנית הקריאות (Call Stack).",
        code: `public static Queue<int> CloneQueue(Queue<int> source)
{
    Queue<int> copy = new Queue<int>();
    Queue<int> temp = new Queue<int>();

    while (!source.IsEmpty())
    {
        int item = source.Remove();
        copy.Insert(item);
        temp.Insert(item);
    }

    while (!temp.IsEmpty())
    {
        source.Insert(temp.Remove());
    }

    return copy;
}

public static void Main(Queue<int> q)
{
    Queue<int> duplicated = CloneQueue(q);
}`
    },
    {
        id: "bad_preservation",
        title: "7. טעות נפוצה: אי-שחזור התור המקורי (אזהרה פדגוגית)",
        difficulty: "הדגמת שגיאה",
        initialQueue: [10, 20, 30],
        description: "דוגמה לתלמיד שסופר איברים אך שוכח לשמור בתור עזר ולשחזר. שים לב להתרעת הדיבאגר בסיום הריצה!",
        code: `public static int BadCount(Queue<int> q)
{
    int count = 0;

    // התלמיד רוקן את התור אך לא שמר אותו!
    while (!q.IsEmpty())
    {
        count++;
        int val = q.Remove();
    }

    return count;
}`
    }
];

if (typeof window !== 'undefined') {
    window.PRESETS = PRESETS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRESETS };
}
