/**
 * Autocomplete & IntelliSense Engine with Pedagogical Documentation
 * אלון שרייבמן - מגמת מדעי המחשב
 * תמיכה מלאה בכל מבני הנתונים של משרד החינוך: Queue<T>, Stack<T>, Node<T>, BinNode<T>
 */

class AutocompleteEngine {
    constructor(textarea, popupContainer, onAcceptCallback, getActiveDsCallback = null) {
        this.textarea = textarea;
        this.popup = popupContainer;
        this.listEl = popupContainer.querySelector('#autocomplete-list');
        this.docEl = popupContainer.querySelector('#autocomplete-doc');
        this.onAccept = onAcceptCallback;
        this.getActiveDsCallback = getActiveDsCallback;

        this.visible = false;
        this.items = [];
        this.selectedIndex = 0;
        this.currentPrefix = '';
        this.replaceStart = 0;
        this.replaceEnd = 0;

        this.catalog = this.initCatalog();
        this.bindEvents();
    }

    getCurrentDataStructure(lowerObj = '') {
        // 1. עדיפות ראשונה: זיהוי סוג מבנה הנתונים לפי שם המשתנה/אובייקט לפני הנקודה
        if (lowerObj) {
            if (/^(st|stack|s|mystack|tempst|auxst)/.test(lowerObj)) return 'stack';
            if (/^(node|chain|pos|p|curr|current|head|first|lst|list|prev|next|pnode)/.test(lowerObj)) return 'node';
            if (/^(root|tree|t|bin|binnode|left|right|sub|subtree)/.test(lowerObj)) return 'binnode';
            if (/^(q|queue|myqueue|tempq|temp|auxq)/.test(lowerObj)) return 'queue';
        }

        // 2. עדיפות שנייה: קבלת הלשונית הפעילה בעורך (Studio mode)
        if (typeof this.getActiveDsCallback === 'function') {
            const mode = this.getActiveDsCallback();
            if (mode && mode !== 'all') return mode;
        }
        if (typeof window !== 'undefined') {
            const app = window.visualizer || window.app;
            if (app && app.studioMode && app.studioMode !== 'all') {
                return app.studioMode;
            }
        }

        return null;
    }

    initCatalog() {
        return [
            // ==========================================
            // פעולות תור ומחסנית משותפות
            // ==========================================
            {
                id: 'queue-isempty',
                label: 'IsEmpty()',
                insertText: 'IsEmpty()',
                cursorOffset: 0,
                category: 'method',
                ds: 'queue',
                typeBadge: 'bool',
                signature: 'public bool IsEmpty()',
                params: 'אין פרמטרים.',
                returns: 'bool — מחזירה true אם המבנה (תור או מחסנית) ריק, או false אם יש בו איבר אחד לפחות.',
                desc: 'בודקת האם התור או המחסנית ריקים מאיברים. שימושית במיוחד בתנאי לולאות סריקה: while (!q.IsEmpty()) או while (!st.IsEmpty()). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['isempty', 'isemp', 'is', 'empty', 'emp', 'st.isempty', 'q.isempty'],
                categoryBadge: 'פעולת תור / מחסנית (Method)'
            },

            // ==========================================
            // פעולות תור (Queue<T>)
            // ==========================================
            {
                id: 'queue-insert',
                label: 'Insert(x)',
                insertText: 'Insert()',
                cursorOffset: -1, // סמן בתוך הסוגריים
                category: 'method',
                ds: 'queue',
                typeBadge: 'void',
                signature: 'public void Insert(T x)',
                params: 'T x — הערך להכנסה לסוף התור (Tail).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מכניסה את הערך x לסוף התור (Tail). גודל התור גדל ב-1. שומרת על עקרון FIFO (ראשון נכנס, ראשון יוצא). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['insert', 'ins', 'in', 'add', 'enqueue', 'push', 'q.insert'],
                categoryBadge: 'פעולת תור (Queue)'
            },
            {
                id: 'queue-remove',
                label: 'Remove()',
                insertText: 'Remove()',
                cursorOffset: 0,
                category: 'method',
                ds: 'queue',
                typeBadge: 'T',
                signature: 'public T Remove()',
                params: 'אין פרמטרים.',
                returns: 'T — הערך שהיה בראש התור והוצא ממנו.',
                desc: 'מוציאה ומחזירה את האיבר הנמצא בראש התור (Head). כל שאר האיברים בתור מתקדמים קדימה. סיבוכיות: O(1). ⚠️ שים לב: הפעולה זורקת שגיאת ריצה (QueueEmptyException) אם התור ריק! תמיד יש לבדוק IsEmpty() לפני קריאה ל-Remove.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['remove', 'rem', 're', 'rm', 'dequeue', 'pop', 'q.remove'],
                categoryBadge: 'פעולת תור (Queue)'
            },
            {
                id: 'queue-head',
                label: 'Head()',
                insertText: 'Head()',
                cursorOffset: 0,
                category: 'method',
                ds: 'queue',
                typeBadge: 'T',
                signature: 'public T Head()',
                params: 'אין פרמטרים.',
                returns: 'T — הערך הנמצא בראש התור.',
                desc: 'מציצה באיבר שבראש התור (Head) ומחזירה את ערכו מבלי להוציאו ומבלי לשנות את התור. סיבוכיות: O(1). ⚠️ שים לב: הפעולה זורקת שגיאת ריצה (QueueEmptyException) אם התור ריק!',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['head', 'he', 'front', 'q.head'],
                categoryBadge: 'פעולת תור (Queue)'
            },

            // ==========================================
            // פעולות מחסנית (Stack<T>)
            // ==========================================
            {
                id: 'stack-push',
                label: 'Push(x)',
                insertText: 'Push()',
                cursorOffset: -1,
                category: 'method',
                ds: 'stack',
                typeBadge: 'void',
                signature: 'public void Push(T x)',
                params: 'T x — הערך לדחיפה לראש המחסנית (Top).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'דוחפת את הערך x לראש המחסנית (Top). גודל המחסנית גדל ב-1. שומרת על עקרון LIFO (אחרון נכנס, ראשון יוצא). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['push', 'pus', 'add', 'insert', 'st.push'],
                categoryBadge: 'פעולת מחסנית (Stack)'
            },
            {
                id: 'stack-pop',
                label: 'Pop()',
                insertText: 'Pop()',
                cursorOffset: 0,
                category: 'method',
                ds: 'stack',
                typeBadge: 'T',
                signature: 'public T Pop()',
                params: 'אין פרמטרים.',
                returns: 'T — הערך שהיה בראש המחסנית ונשלף ממנה.',
                desc: 'שולפת ומחזירה את האיבר הנמצא בראש המחסנית (Top). גודל המחסנית קטן ב-1. סיבוכיות: O(1). ⚠️ שים לב: הפעולה זורקת שגיאת ריצה (StackEmptyException) אם המחסנית ריקה! תמיד יש לבדוק IsEmpty() לפני קריאה ל-Pop.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['pop', 'po', 'remove', 'pull', 'st.pop'],
                categoryBadge: 'פעולת מחסנית (Stack)'
            },
            {
                id: 'stack-top',
                label: 'Top()',
                insertText: 'Top()',
                cursorOffset: 0,
                category: 'method',
                ds: 'stack',
                typeBadge: 'T',
                signature: 'public T Top()',
                params: 'אין פרמטרים.',
                returns: 'T — הערך הנמצא בראש המחסנית.',
                desc: 'מציצה באיבר שבראש המחסנית (Top) ומחזירה את ערכו מבלי לשלוף אותו ומבלי לשנות את המחסנית. סיבוכיות: O(1). ⚠️ שים לב: לפי תקן משרד החינוך הפעולה נקראת Top() (ולא Peek). הפעולה זורקת שגיאת ריצה אם המחסנית ריקה!',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['top', 'to', 'peek', 'front', 'st.top'],
                categoryBadge: 'פעולת מחסנית (Stack)'
            },

            // ==========================================
            // פעולות חוליה (Node<T>)
            // ==========================================
            {
                id: 'node-getinfo',
                label: 'GetInfo()',
                insertText: 'GetInfo()',
                cursorOffset: 0,
                category: 'method',
                ds: 'node',
                typeBadge: 'T',
                signature: 'public T GetInfo()',
                params: 'אין פרמטרים.',
                returns: 'T — ערך המידע (info) השמור בחוליה.',
                desc: 'מחזירה את ערך המידע המאוחסן בחוליה הנוכחית בשרשרת החוליות. הפעולה אינה משנה את השרשרת. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['getinfo', 'get', 'info', 'val', 'value', 'node.getinfo', 'chain.getinfo'],
                categoryBadge: 'פעולת חוליה (Node)'
            },
            {
                id: 'node-setinfo',
                label: 'SetInfo(x)',
                insertText: 'SetInfo()',
                cursorOffset: -1,
                category: 'method',
                ds: 'node',
                typeBadge: 'void',
                signature: 'public void SetInfo(T x)',
                params: 'T x — ערך המידע החדש להשמה בחוליה.',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מעדכנת ומשנה את ערך המידע (info) המאוחסן בחוליה הנוכחית לערך x. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['setinfo', 'set', 'info', 'update', 'node.setinfo', 'chain.setinfo'],
                categoryBadge: 'פעולת חוליה (Node)'
            },
            {
                id: 'node-getnext',
                label: 'GetNext()',
                insertText: 'GetNext()',
                cursorOffset: 0,
                category: 'method',
                ds: 'node',
                typeBadge: 'Node<T>',
                signature: 'public Node<T> GetNext()',
                params: 'אין פרמטרים.',
                returns: 'Node<T> — הפניה לחוליה העוקבת בשרשרת, או null אם זוהי החוליה האחרונה.',
                desc: 'מחזירה הפניה (מצביע) לחוליה הבאה בשרשרת החוליות. משמשת לקידום מצביע הסריקה בלולאה: pos = pos.GetNext(). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['getnext', 'next', 'getn', 'node.getnext', 'step', 'chain.getnext'],
                categoryBadge: 'פעולת חוליה (Node)'
            },
            {
                id: 'node-setnext',
                label: 'SetNext(next)',
                insertText: 'SetNext()',
                cursorOffset: -1,
                category: 'method',
                ds: 'node',
                typeBadge: 'void',
                signature: 'public void SetNext(Node<T> next)',
                params: 'Node<T> next — הפניה לחוליה החדשה שתקושר אחרי חוליה זו (או null לניתוק).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מעדכנת את ההפניה של החוליה הנוכחית כך שתצביע לחוליה next. משמשת להכנסה, ניתוק וקישור חוליות בשרשרת. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['setnext', 'next', 'link', 'setn', 'node.setnext', 'chain.setnext'],
                categoryBadge: 'פעולת חוליה (Node)'
            },
            {
                id: 'node-hasnext',
                label: 'HasNext()',
                insertText: 'HasNext()',
                cursorOffset: 0,
                category: 'method',
                ds: 'node',
                typeBadge: 'bool',
                signature: 'public bool HasNext()',
                params: 'אין פרמטרים.',
                returns: 'bool — true אם קיימת חוליה עוקבת (GetNext() != null), או false אם זו החוליה האחרונה.',
                desc: 'בודקת האם קיימת חוליה עוקבת אחרי חוליה זו בשרשרת (שקול לבדיקה: GetNext() != null). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['hasnext', 'has', 'hasn', 'node.hasnext', 'chain.hasnext'],
                categoryBadge: 'פעולת חוליה (Node)'
            },

            // ==========================================
            // פעולות עץ בינארי (BinNode<T>)
            // ==========================================
            {
                id: 'binnode-getvalue',
                label: 'GetValue()',
                insertText: 'GetValue()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'T',
                signature: 'public T GetValue()',
                params: 'אין פרמטרים.',
                returns: 'T — ערך המידע (value) השמור בצומת העץ הנוכחי.',
                desc: 'מחזירה את ערך המידע השמור בצומת הנוכחי של העץ הבינארי. ⚠️ שים לב: בעץ בינארי הפעולה נקראת GetValue() (להבדיל מ-GetInfo() בחוליה). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['getvalue', 'getval', 'val', 'value', 'tree.getvalue', 'binnode.getvalue', 'root.getvalue'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-setvalue',
                label: 'SetValue(x)',
                insertText: 'SetValue()',
                cursorOffset: -1,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'void',
                signature: 'public void SetValue(T x)',
                params: 'T x — ערך המידע החדש להשמה בצומת העץ.',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מעדכנת ומשנה את ערך המידע השמור בצומת הנוכחי לערך x. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['setvalue', 'setval', 'val', 'binnode.setvalue', 'root.setvalue'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-getleft',
                label: 'GetLeft()',
                insertText: 'GetLeft()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'BinNode<T>',
                signature: 'public BinNode<T> GetLeft()',
                params: 'אין פרמטרים.',
                returns: 'BinNode<T> — הפניה לתת-העץ השמאלי (בן שמאלי), או null אם אין בן שמאלי.',
                desc: 'מחזירה את שורש תת-העץ השמאלי של הצומת הנוכחי. משמשת לקריאות רקורסיביות כגון Traverse(root.GetLeft()). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['getleft', 'left', 'getl', 'binnode.getleft', 'root.getleft'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-setleft',
                label: 'SetLeft(left)',
                insertText: 'SetLeft()',
                cursorOffset: -1,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'void',
                signature: 'public void SetLeft(BinNode<T> left)',
                params: 'BinNode<T> left — תת-העץ לקביעה כבן שמאלי (או null לניתוק).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מעדכנת את ההפניה לתת-העץ השמאלי של הצומת הנוכחי. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['setleft', 'left', 'setl', 'binnode.setleft', 'root.setleft'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-getright',
                label: 'GetRight()',
                insertText: 'GetRight()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'BinNode<T>',
                signature: 'public BinNode<T> GetRight()',
                params: 'אין פרמטרים.',
                returns: 'BinNode<T> — הפניה לתת-העץ הימני (בן ימני), או null אם אין בן ימני.',
                desc: 'מחזירה את שורש תת-העץ הימני של הצומת הנוכחי. משמשת לקריאות רקורסיביות כגון Traverse(root.GetRight()). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['getright', 'right', 'getr', 'binnode.getright', 'root.getright'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-setright',
                label: 'SetRight(right)',
                insertText: 'SetRight()',
                cursorOffset: -1,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'void',
                signature: 'public void SetRight(BinNode<T> right)',
                params: 'BinNode<T> right — תת-העץ לקביעה כבן ימני (או null לניתוק).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מעדכנת את ההפניה לתת-העץ הימני של הצומת הנוכחי. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['setright', 'right', 'setr', 'binnode.setright', 'root.setright'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-hasleft',
                label: 'HasLeft()',
                insertText: 'HasLeft()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'bool',
                signature: 'public bool HasLeft()',
                params: 'אין פרמטרים.',
                returns: 'bool — true אם קיים בן שמאלי (GetLeft() != null), אחרת false.',
                desc: 'בודקת האם לצומת הנוכחי יש תת-עץ שמאלי (שקול לבדיקה: GetLeft() != null). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['hasleft', 'hasl', 'left', 'binnode.hasleft', 'root.hasleft'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-hasright',
                label: 'HasRight()',
                insertText: 'HasRight()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'bool',
                signature: 'public bool HasRight()',
                params: 'אין פרמטרים.',
                returns: 'bool — true אם קיים בן ימני (GetRight() != null), אחרת false.',
                desc: 'בודקת האם לצומת הנוכחי יש תת-עץ ימני (שקול לבדיקה: GetRight() != null). סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['hasright', 'hasr', 'right', 'binnode.hasright', 'root.hasright'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },
            {
                id: 'binnode-isleaf',
                label: 'IsLeaf()',
                insertText: 'IsLeaf()',
                cursorOffset: 0,
                category: 'method',
                ds: 'binnode',
                typeBadge: 'bool',
                signature: 'public bool IsLeaf()',
                params: 'אין פרמטרים.',
                returns: 'bool — true אם הצומת הוא עלה (אין לו בנים: !HasLeft() && !HasRight()), אחרת false.',
                desc: 'בודקת האם הצומת הנוכחי הוא עלה בעץ בינארי (ללא בן שמאלי וללא בן ימני). שימושית במיוחד בתנאי עצירה ברקורסיה על עצים. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['isleaf', 'leaf', 'isLeaf', 'binnode.isleaf', 'tree.isleaf', 'root.isleaf'],
                categoryBadge: 'פעולת עץ בינארי (BinNode)'
            },

            // ==========================================
            // פעולות כלליות ומסוף
            // ==========================================
            {
                id: 'tostring',
                label: 'ToString()',
                insertText: 'ToString()',
                cursorOffset: 0,
                category: 'method',
                ds: 'all',
                typeBadge: 'string',
                signature: 'public override string ToString()',
                params: 'אין פרמטרים.',
                returns: 'string — מחרוזת המייצגת את איברי המבנה.',
                desc: 'מחזירה ייצוג מחרוזתי קריא של איברי המבנה (תור, מחסנית, שרשרת חוליות או עץ בינארי). סיבוכיות זמן ריצה: O(n).',
                triggersOnDot: true,
                triggersStandalone: false,
                keywords: ['tostring', 'to', 'str'],
                categoryBadge: 'פעולה (Method)'
            },
            {
                id: 'console-writeline',
                label: 'Console.WriteLine(...)',
                insertText: 'Console.WriteLine()',
                cursorOffset: -1,
                category: 'console',
                ds: 'all',
                typeBadge: 'void',
                signature: 'public static void WriteLine(object value)',
                params: 'ערך, משתנה, מחרוזת, או ביטוי להדפסה (כולל שרשור מחרוזות באמצעות + ותבניות עיצוב).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מדפיסה את הערך למסוף הפלט (Console Output) של הדיבאגר ויורדת שורה חדשה. מאפשרת מעקב נוח אחר משתנים במהלך ריצת האלגוריתם.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['console.writeline', 'console.wr', 'console.w', 'writeline', 'console', 'cw', 'con', 'print'],
                categoryBadge: 'פעולת מסוף (Console)'
            },
            {
                id: 'console-write',
                label: 'Console.Write(...)',
                insertText: 'Console.Write()',
                cursorOffset: -1,
                category: 'console',
                ds: 'all',
                typeBadge: 'void',
                signature: 'public static void Write(object value)',
                params: 'ערך או מחרוזת להדפסה.',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מדפיסה ערך למסוף הפלט ללא ירידת שורה.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['console.write', 'write'],
                categoryBadge: 'פעולת מסוף (Console)'
            },

            // ==========================================
            // יצירת מופעים ובנאים (Constructors & Classes)
            // ==========================================
            {
                id: 'new-queue',
                label: 'new Queue<int>()',
                insertText: 'new Queue<int>()',
                cursorOffset: 0,
                category: 'class',
                ds: 'queue',
                typeBadge: 'Queue<int>',
                signature: 'Queue<int> temp = new Queue<int>();',
                params: 'אין פרמטרים (בנאי ברירת מחדל ריק).',
                returns: 'מופע תור חדש וריק.',
                desc: 'יוצרת מופע חדש וריק של תור שלמים. התור החדש יתווסף ויוצג מיד בחלון מסילת התורים בהמחשה הויזואלית.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new queue', 'new q', 'queue<int>', 'new', 'que'],
                categoryBadge: 'מבנה נתונים (Queue)'
            },
            {
                id: 'new-stack',
                label: 'new Stack<int>()',
                insertText: 'new Stack<int>()',
                cursorOffset: 0,
                category: 'class',
                ds: 'stack',
                typeBadge: 'Stack<int>',
                signature: 'Stack<int> temp = new Stack<int>();',
                params: 'אין פרמטרים (בנאי ברירת מחדל ריק).',
                returns: 'מופע מחסנית חדש וריק.',
                desc: 'יוצרת מופע חדש וריק של מחסנית שלמים. המחסנית החדשה תוצג מיד כמכל אנכי (Canister) בהמחשה הויזואלית.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new stack', 'new st', 'stack<int>', 'new', 'sta'],
                categoryBadge: 'מבנה נתונים (Stack)'
            },
            {
                id: 'new-node',
                label: 'new Node<int>(x)',
                insertText: 'new Node<int>()',
                cursorOffset: -1,
                category: 'class',
                ds: 'node',
                typeBadge: 'Node<int>',
                signature: 'Node<int> node = new Node<int>(x);',
                params: 'int x — ערך המידע בחוליה. ההפניה לעוקב תאותחל ל-null.',
                returns: 'מופע חוליה חדש עם ערך x.',
                desc: 'בנאי היוצר חוליה חדשה ומבודדת עם הערך x (ההפניה לחוליה הבאה תהיה null). תוצג כקפסולת חוליה עם תא ערך ומצביע.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new node', 'node', 'node<int>', 'new node<int>'],
                categoryBadge: 'בנאי חוליה (Node)'
            },
            {
                id: 'new-node-next',
                label: 'new Node<int>(x, next)',
                insertText: 'new Node<int>(x, next)',
                cursorOffset: 0,
                category: 'class',
                ds: 'node',
                typeBadge: 'Node<int>',
                signature: 'Node<int> chain = new Node<int>(x, next);',
                params: 'int x — ערך המידע, Node<int> next — הפניה לחוליה הבאה.',
                returns: 'מופע חוליה חדש המקושר לחוליה הבאה next.',
                desc: 'בנאי היוצר חוליה חדשה עם ערך x המקושרת לחוליה הבאה next. שימושי במיוחד להוספת איבר לראש שרשרת: chain = new Node<int>(x, chain);',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new node next', 'node next', 'node<int>(x, next)', 'new node<int> next'],
                categoryBadge: 'בנאי חוליה (Node)'
            },
            {
                id: 'new-binnode',
                label: 'new BinNode<int>(x)',
                insertText: 'new BinNode<int>()',
                cursorOffset: -1,
                category: 'class',
                ds: 'binnode',
                typeBadge: 'BinNode<int>',
                signature: 'BinNode<int> leaf = new BinNode<int>(x);',
                params: 'int x — ערך המידע בצומת (הבנים שמאל וימין מאותחלים ל-null).',
                returns: 'מופע צומת עלה חדש.',
                desc: 'בנאי היוצר צומת עלה חדש עם הערך x (ללא בנים). יוצג כצומת עגול בהמחשה הגרפית של העץ.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new binnode', 'binnode', 'new bin', 'tree node', 'binnode<int>'],
                categoryBadge: 'בנאי עץ בינארי (BinNode)'
            },
            {
                id: 'new-binnode-full',
                label: 'new BinNode<int>(left, x, right)',
                insertText: 'new BinNode<int>(left, x, right)',
                cursorOffset: 0,
                category: 'class',
                ds: 'binnode',
                typeBadge: 'BinNode<int>',
                signature: 'BinNode<int> root = new BinNode<int>(left, x, right);',
                params: 'BinNode<int> left — בן שמאלי, int x — ערך הצומת, BinNode<int> right — בן ימני.',
                returns: 'מופע צומת עץ בינארי חדש עם בנים מקושרים.',
                desc: 'בנאי היוצר צומת עץ בינארי ומקשר אליו ישירות תת-עץ שמאלי ותת-עץ ימני.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new binnode left right', 'binnode(left, x, right)', 'tree full constructor'],
                categoryBadge: 'בנאי עץ בינארי (BinNode)'
            },

            // ==========================================
            // תבניות סריקה ולולאות (Snippets)
            // ==========================================
            {
                id: 'while-queue',
                label: 'while (!q.IsEmpty())',
                insertText: `while (!q.IsEmpty())
    {
        int x = q.Remove();
        
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'queue',
                typeBadge: 'תבנית תור',
                signature: 'while (!q.IsEmpty())',
                params: 'בדיקת תנאי תור ריק.',
                returns: 'לולאת סריקה וריקון תור.',
                desc: 'תבנית המעבר הסטנדרטית בבגרות לסריקה ועיבוד של כל איברי התור q עד לריקונו המלא.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['while queue', 'while (!q', 'loop queue', 'scan queue', 'whi'],
                categoryBadge: 'תבנית תור (Queue Snippet)'
            },
            {
                id: 'while-stack',
                label: 'while (!st.IsEmpty())',
                insertText: `while (!st.IsEmpty())
    {
        int x = st.Pop();
        
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'stack',
                typeBadge: 'תבנית מחסנית',
                signature: 'while (!st.IsEmpty())',
                params: 'בדיקת תנאי מחסנית ריקה.',
                returns: 'לולאת סריקה וריקון מחסנית.',
                desc: 'תבנית סריקה סטנדרטית בבגרות לעיבוד איברי מחסנית st עד לריקונה (שליפה מה-Top כלפי מטה).',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['while stack', 'while (!st', 'st.isempty', 'stack loop'],
                categoryBadge: 'תבנית מחסנית (Stack Snippet)'
            },
            {
                id: 'stack-restore-pattern',
                label: 'Stack scan & restore (temp helper)',
                insertText: `Stack<int> temp = new Stack<int>();
    while (!st.IsEmpty())
    {
        int x = st.Pop();
        
        temp.Push(x);
    }
    while (!temp.IsEmpty())
    {
        st.Push(temp.Pop());
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'stack',
                typeBadge: 'סריקה ושחזור',
                signature: 'Stack<int> temp = new Stack<int>(); while (!st.IsEmpty()) ...',
                params: 'סריקת מחסנית ושמירת איבריה במחסנית עזר לשחזור.',
                returns: 'מעבר על כל איברי המחסנית והחזרתם למצב המקורי.',
                desc: 'תבנית העבודה הקלאסית בבגרות: מעבר על כל איברי מחסנית st תוך שמירתם במחסנית עזר temp, ושחזור המחסנית המקורית בסיום.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['stack restore', 'stack helper', 'stack temp', 'restore stack', 'scan and restore'],
                categoryBadge: 'תבנית מחסנית (Stack Snippet)'
            },
            {
                id: 'queue-restore-pattern',
                label: 'Queue scan & restore (temp helper)',
                insertText: `Queue<int> temp = new Queue<int>();
    while (!q.IsEmpty())
    {
        int x = q.Remove();
        
        temp.Insert(x);
    }
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'queue',
                typeBadge: 'סריקה ושחזור',
                signature: 'Queue<int> temp = new Queue<int>(); while (!q.IsEmpty()) ...',
                params: 'סריקת תור ושמירת איבריו בתור עזר לשחזור.',
                returns: 'מעבר על כל איברי התור והחזרתם למצב המקורי.',
                desc: 'תבנית העבודה הקלאסית בבגרות: מעבר על כל איברי תור q תוך שמירתם בתור עזר temp, ושחזור התור המקורי בסיום.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['queue restore', 'queue helper', 'queue temp', 'restore queue'],
                categoryBadge: 'תבנית תור (Queue Snippet)'
            },
            {
                id: 'while-node',
                label: 'Node runner: while (pos != null)',
                insertText: `Node<int> pos = chain;
    while (pos != null)
    {
        int val = pos.GetInfo();
        
        pos = pos.GetNext();
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'node',
                typeBadge: 'סריקת חוליות',
                signature: 'Node<int> pos = chain; while (pos != null)',
                params: 'שרשרת חוליות לסריקה.',
                returns: 'תבנית סריקה עם מצביע רץ pos.',
                desc: 'תבנית סריקה סטנדרטית בבגרות למעבר על כל איברי שרשרת החוליות באמצעות מצביע רץ pos עד לסיום השרשרת (pos == null).',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['while node', 'while (pos != null)', 'node loop', 'runner', 'scan chain', 'pos', 'chain'],
                categoryBadge: 'תבנית חוליות (Node Snippet)'
            },
            {
                id: 'node-insert-head',
                label: 'Insert first: chain = new Node<int>(x, chain);',
                insertText: 'chain = new Node<int>(x, chain);',
                cursorOffset: 0,
                category: 'snippet',
                ds: 'node',
                typeBadge: 'הוספה לראש',
                signature: 'chain = new Node<int>(x, chain);',
                params: 'ערך להוספה ושרשרת מקור.',
                returns: 'עדכון ראש השרשרת ב-O(1).',
                desc: 'הוספת חוליה חדשה בתחילת שרשרת החוליות (בראש השרשרת) בסיבוכיות O(1).',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['insert first', 'add first', 'insert head', 'new node chain', 'chain = new node'],
                categoryBadge: 'תבנית חוליות (Node Snippet)'
            },
            {
                id: 'binnode-inorder',
                label: 'InOrder Traversal: InOrder(root)',
                insertText: `public static void InOrder(BinNode<int> root)
    {
        if (root != null)
        {
            InOrder(root.GetLeft());
            Console.WriteLine(root.GetValue());
            InOrder(root.GetRight());
        }
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'סריקה תוכית (InOrder)',
                signature: 'public static void InOrder(BinNode<int> root)',
                params: 'שורש העץ או תת-העץ לסריקה.',
                returns: 'סריקה רקורסיבית תוכה: שמאל, שורש, ימין.',
                desc: 'סריקה בסדר תוכי (In-Order): מבקרת קודם בתת-העץ השמאלי, אחר כך בצומת הנוכחי, ולבסוף בתת-העץ הימני. בעץ חיפוש בינארי (BST) סריקה זו מדפיסה את האיברים ממוינים בסדר עולה!',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['inorder', 'in-order', 'scan tree', 'tree inorder', 'traverse'],
                categoryBadge: 'תבנית עץ בינארי (Tree Snippet)'
            },
            {
                id: 'binnode-preorder',
                label: 'PreOrder Traversal: PreOrder(root)',
                insertText: `public static void PreOrder(BinNode<int> root)
    {
        if (root != null)
        {
            Console.WriteLine(root.GetValue());
            PreOrder(root.GetLeft());
            PreOrder(root.GetRight());
        }
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'סריקה תחילית (PreOrder)',
                signature: 'public static void PreOrder(BinNode<int> root)',
                params: 'שורש העץ או תת-העץ לסריקה.',
                returns: 'סריקה רקורסיבית: שורש, שמאל, ימין.',
                desc: 'סריקה בסדר תחילי (Pre-Order): מבקרת קודם בצומת הנוכחי, אחר כך בתת-העץ השמאלי, ולבסוף בתת-העץ הימני.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['preorder', 'pre-order', 'pre order', 'scan pre'],
                categoryBadge: 'תבנית עץ בינארי (Tree Snippet)'
            },
            {
                id: 'binnode-postorder',
                label: 'PostOrder Traversal: PostOrder(root)',
                insertText: `public static void PostOrder(BinNode<int> root)
    {
        if (root != null)
        {
            PostOrder(root.GetLeft());
            PostOrder(root.GetRight());
            Console.WriteLine(root.GetValue());
        }
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'סריקה סופית (PostOrder)',
                signature: 'public static void PostOrder(BinNode<int> root)',
                params: 'שורש העץ או תת-העץ לסריקה.',
                returns: 'סריקה רקורסיבית: שמאל, ימין, שורש.',
                desc: 'סריקה בסדר סופי (Post-Order): מבקרת קודם בתתי-העצים (שמאל ואז ימין) ורק בסוף בצומת הנוכחי. מתאימה במיוחד לפעולות חישוב ופירוק מלמטה למעלה.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['postorder', 'post-order', 'post order', 'scan post'],
                categoryBadge: 'תבנית עץ בינארי (Tree Snippet)'
            },
            {
                id: 'binnode-count',
                label: 'CountNodes(root)',
                insertText: `public static int CountNodes(BinNode<int> root)
    {
        if (root == null)
            return 0;
        return 1 + CountNodes(root.GetLeft()) + CountNodes(root.GetRight());
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'ספירת צמתים',
                signature: 'public static int CountNodes(BinNode<int> root)',
                params: 'שורש העץ.',
                returns: 'מספר הצמתים הכולל בעץ.',
                desc: 'חישוב רקורסיבי של סך כל הצמתים בעץ בינארי.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['countnodes', 'count tree', 'size tree', 'nodes'],
                categoryBadge: 'תבנית עץ בינארי (Tree Snippet)'
            },
            {
                id: 'binnode-sum',
                label: 'SumTree(root)',
                insertText: `public static int SumTree(BinNode<int> root)
    {
        if (root == null)
            return 0;
        return root.GetValue() + SumTree(root.GetLeft()) + SumTree(root.GetRight());
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'סכום ערכים בעץ',
                signature: 'public static int SumTree(BinNode<int> root)',
                params: 'שורש עץ שלמים.',
                returns: 'סכום ערכי כל הצמתים.',
                desc: 'חישוב רקורסיבי של סכום ערכי כל הצמתים בעץ בינארי של מספרים שלמים.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['sumtree', 'sum tree', 'sum binnode', 'total tree'],
                categoryBadge: 'תבנית עץ בינארי (Tree Snippet)'
            },

            // ==========================================
            // מבנה תוכנית ראשית (Program Classes)
            // ==========================================
            {
                id: 'class-program',
                label: 'public class Program (Queue)',
                insertText: `public class Program
{
    public static void Main(Queue<int> q)
    {
        
    }
}`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'queue',
                typeBadge: 'תוכנית ראשית',
                signature: 'public class Program { public static void Main(Queue<int> q) }',
                params: 'מחלקה עוטפת ופעולת Main המקבלת תור q.',
                returns: 'מבנה תוכנית תקני ב-C#.',
                desc: 'המבנה התקני של תוכנית C# עם מחלקת Program ופעולת כניסה ראשית Main המקבלת את התור q כפרמטר.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['program', 'class program', 'main', 'prog', 'public class program queue'],
                categoryBadge: 'תוכנית ראשית (Program)'
            },
            {
                id: 'class-program-stack',
                label: 'public class Program (Stack)',
                insertText: `public class Program
{
    public static void Main(Stack<int> st)
    {
        
    }
}`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'stack',
                typeBadge: 'תוכנית ראשית',
                signature: 'public class Program { public static void Main(Stack<int> st) }',
                params: 'מחלקה עוטפת ופעולת Main המקבלת מחסנית st.',
                returns: 'מבנה תוכנית תקני ב-C#.',
                desc: 'המבנה התקני של תוכנית C# עם מחלקת Program ופעולת כניסה ראשית Main המקבלת את המחסנית st כפרמטר.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['program stack', 'main stack', 'public class program stack'],
                categoryBadge: 'תוכנית ראשית (Program)'
            },
            {
                id: 'class-program-node',
                label: 'public class Program (Node)',
                insertText: `public class Program
{
    public static void Main(Node<int> chain)
    {
        
    }
}`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'node',
                typeBadge: 'תוכנית ראשית',
                signature: 'public class Program { public static void Main(Node<int> chain) }',
                params: 'מחלקה עוטפת ופעולת Main המקבלת שרשרת חוליות chain.',
                returns: 'מבנה תוכנית תקני ב-C#.',
                desc: 'המבנה התקני של תוכנית C# עם מחלקת Program ופעולת כניסה ראשית Main המקבלת שרשרת חוליות chain כפרמטר.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['program node', 'main node', 'public class program node'],
                categoryBadge: 'תוכנית ראשית (Program)'
            },
            {
                id: 'class-program-binnode',
                label: 'public class Program (BinNode)',
                insertText: `public class Program
{
    public static void Main(BinNode<int> root)
    {
        
    }
}`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'binnode',
                typeBadge: 'תוכנית ראשית',
                signature: 'public class Program { public static void Main(BinNode<int> root) }',
                params: 'מחלקה עוטפת ופעולת Main המקבלת שורש עץ בינארי root.',
                returns: 'מבנה תוכנית תקני ב-C#.',
                desc: 'המבנה התקני של תוכנית C# עם מחלקת Program ופעולת כניסה ראשית Main המקבלת שורש עץ בינארי root כפרמטר.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['program tree', 'program binnode', 'main binnode', 'public class program binnode'],
                categoryBadge: 'תוכנית ראשית (Program)'
            },

            // ==========================================
            // מחלקות מותאמות אישית ומאפיינים
            // ==========================================
            {
                id: 'property-auto',
                label: 'public int X { get; set; }',
                insertText: 'public int X { get; set; }',
                cursorOffset: 0,
                category: 'snippet',
                ds: 'all',
                typeBadge: 'מאפיין (Property)',
                signature: 'public int X { get; set; }',
                params: 'הגדרת מאפיין אוטומטי.',
                returns: 'Getter ו-Setter אוטומטיים.',
                desc: 'הגדרת מאפיין אוטומטי ב-C# (Auto-Property) המספק פעולות אחזור (get) ועדכון (set) מקוצרות עם כימוס מלא.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['prop', 'property', 'get set', 'get; set;', 'getter setter'],
                categoryBadge: 'מאפיין (Property)'
            },
            {
                id: 'getter-setter-methods',
                label: 'GetX() / SetX(value)',
                insertText: `public int GetX()
    {
        return this.x;
    }

    public void SetX(int value)
    {
        this.x = value;
    }`,
                cursorOffset: 0,
                category: 'snippet',
                ds: 'all',
                typeBadge: 'Get / Set',
                signature: 'public int GetX() / public void SetX(int value)',
                params: 'פעולות גישה ועדכון לשדה פרטי.',
                returns: 'קריאה וכתיבה לשדה פרטי.',
                desc: 'פעולות Get ו-Set סטנדרטיות המאפשרות גישה מבוקרת (כימוס) לשדות private במחלקה.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['getter', 'setter', 'getx', 'setx', 'get', 'set'],
                categoryBadge: 'פעולות גישה ועדכון'
            },
            {
                id: 'class-point',
                label: 'class Point { ... }',
                insertText: `public class Point
{
    private int x;
    private int y;

    public Point(int x, int y)
    {
        this.x = x;
        this.y = y;
    }

    public int GetX()
    {
        return this.x;
    }

    public void SetX(int value)
    {
        this.x = value;
    }

    public int Y
    {
        get { return this.y; }
        set { this.y = value; }
    }

    public override string ToString()
    {
        return "(" + this.x + ", " + this.y + ")";
    }
}`,
                cursorOffset: 0,
                category: 'class',
                ds: 'all',
                typeBadge: 'מחלקה מלאה',
                signature: 'public class Point',
                params: 'שדות private, בנאי, Get/Set, מאפיין Y ו-ToString().',
                returns: 'הגדרת מחלקה עם כימוס מלא.',
                desc: 'תבנית להגדרת מחלקה מותאמת אישית Point לשימוש בתוך Queue<Point>, Stack<Point>, Node<Point> ו-BinNode<Point>. כוללת שדות פרטיים (private), בנאי, פעולות Get/Set, מאפיין ודריסת ToString().',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['class', 'point', 'custom class', 'cls', 'private', 'public', 'protected'],
                categoryBadge: 'מחלקה מותאמת אישית (Custom Class)'
            },
            {
                id: 'new-queue-point',
                label: 'new Queue<Point>()',
                insertText: 'new Queue<Point>()',
                cursorOffset: 0,
                category: 'instantiation',
                ds: 'queue',
                typeBadge: 'Queue<Point>',
                signature: 'public Queue<Point>()',
                params: 'אין פרמטרים.',
                returns: 'מופע תור חדש של נקודות Point.',
                desc: 'יוצרת תור חדש של אובייקטים מסוג Point. כל איבר מוצג ככרטיסיית אובייקט עשירה עם שדות וערכים. פורמט קלט התחלתי: (10, 20), (30, 40) או {x: 10, y: 20}.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new queue<point>', 'point queue', 'queue point'],
                categoryBadge: 'תור אובייקטים (Queue<Point>)'
            },
            {
                id: 'new-queue-queue',
                label: 'new Queue<Queue<int>>()',
                insertText: 'new Queue<Queue<int>>()',
                cursorOffset: 0,
                category: 'instantiation',
                ds: 'queue',
                typeBadge: 'Queue<Queue<int>>',
                signature: 'public Queue<Queue<int>>()',
                params: 'אין פרמטרים.',
                returns: 'מופע תור של תורים חדש.',
                desc: 'יוצרת תור מקונן של תורים (Queue of Queue). כל איבר בתור הוא בעצמו תור שלם עם מסלול פנימי וחיצי זרימה. פורמט קלט התחלתי: [10, 20], [30, 40], [50, 60].',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['queue<queue', 'new queue<queue', 'queue of queue', 'superq'],
                categoryBadge: 'תור מקונן (Queue of Queue)'
            }
        ];
    }

    bindEvents() {
        // סגירת / מזעור פופאפ ההשלמה האוטומטית בלחיצה מחוץ לתיבה (כולל לחיצה בתוך עורך הקוד, על מספרי השורות, או בכל אזור אחר)
        const handleOutsideDismiss = (e) => {
            if (!this.visible) return;
            if (this.popup && this.popup.contains(e.target)) return;
            this.hide();
        };

        document.addEventListener('pointerdown', handleOutsideDismiss, true);
        document.addEventListener('click', handleOutsideDismiss, true);

        // סגירה במקש Escape בכל מקום
        document.addEventListener('keydown', (e) => {
            if (this.visible && e.key === 'Escape') {
                this.hide();
            }
        });

        // סגירה בעת יציאה מחלון הדפדפן
        if (typeof window !== 'undefined') {
            window.addEventListener('blur', () => {
                if (this.visible) this.hide();
            });
        }
    }

    triggerManual() {
        const caretPos = this.textarea.selectionStart;
        const textBeforeCaret = this.textarea.value.substring(0, caretPos);
        const currentLine = textBeforeCaret.substring(textBeforeCaret.lastIndexOf('\n') + 1);

        // בדיקה 1: אם יש נקודה לפני הסמן (למשל: q. או st. או chain. או root. או console.)
        const dotMatch = currentLine.match(/(?:([a-zA-Z_]\w*)\s*\.\s*)([a-zA-Z_]\w*)?$/);
        if (dotMatch) {
            this.onInput();
            return;
        }

        // בדיקה 2: מילה נוכחית (גם אם קצרה מ-2 תווים)
        const wordMatch = currentLine.match(/([a-zA-Z_]\w*)$/);
        if (wordMatch) {
            const word = wordMatch[1];
            const lowerWord = word.toLowerCase();
            const matches = this.catalog.filter(item => {
                return item.label.toLowerCase().includes(lowerWord) ||
                       item.keywords.some(k => k.includes(lowerWord));
            });
            if (matches.length > 0) {
                const activeDs = this.getCurrentDataStructure();
                if (activeDs) {
                    matches.sort((a, b) => {
                        const matchA = (a.ds === activeDs || (activeDs === 'stack' && a.id === 'queue-isempty')) ? 1 : 0;
                        const matchB = (b.ds === activeDs || (activeDs === 'stack' && b.id === 'queue-isempty')) ? 1 : 0;
                        return matchB - matchA;
                    });
                }
                this.replaceStart = caretPos - word.length;
                this.replaceEnd = caretPos;
                this.showSuggestions(matches, word);
                return;
            }
        }

        // בדיקה 3: אם אין תחילית כלל - נציג את כל הקטלוג העשיר לבחירה עם ניעדוף למבנה הפעיל
        this.replaceStart = caretPos;
        this.replaceEnd = caretPos;
        let list = this.catalog.slice();
        const activeDs = this.getCurrentDataStructure();
        if (activeDs) {
            list.sort((a, b) => {
                const matchA = (a.ds === activeDs || (activeDs === 'stack' && a.id === 'queue-isempty')) ? 1 : 0;
                const matchB = (b.ds === activeDs || (activeDs === 'stack' && b.id === 'queue-isempty')) ? 1 : 0;
                return matchB - matchA;
            });
        }
        this.showSuggestions(list, '');
    }

    isOpen() {
        return this.visible && this.items.length > 0;
    }

    onInput() {
        const caretPos = this.textarea.selectionStart;
        const textBeforeCaret = this.textarea.value.substring(0, caretPos);
        const currentLine = textBeforeCaret.substring(textBeforeCaret.lastIndexOf('\n') + 1);

        // בדיקה 1: האם המשתמש מקליד אחרי נקודה (Member access, למשל: q.isEmp, temp.in, chain.get, root.is, console.wr)
        const dotMatch = currentLine.match(/(?:([a-zA-Z_]\w*)\s*\.\s*)([a-zA-Z_]\w*)?$/);
        if (dotMatch) {
            const objectName = dotMatch[1];
            const memberPrefix = dotMatch[2] || '';
            const lowerObj = objectName.toLowerCase();
            const lowerPrefix = memberPrefix.toLowerCase();

            if (lowerObj === 'console') {
                // המשתמש הקליד console. או console.wr -> נציע פעולות Console ונחליף את כל הביטוי ל-Console.WriteLine()
                const matches = this.catalog.filter(item => 
                    item.category === 'console' && 
                    (item.label.toLowerCase().includes(lowerPrefix) || item.keywords.some(k => k.includes(lowerPrefix)))
                );

                if (matches.length > 0) {
                    this.replaceStart = caretPos - dotMatch[0].length;
                    this.replaceEnd = caretPos;
                    this.showSuggestions(matches, memberPrefix);
                    return;
                }
            } else {
                // אובייקט אחר לפני נקודה (למשל תור q, מחסנית st, חוליה chain/pos, עץ root/t)
                const matches = this.catalog.filter(item => 
                    item.triggersOnDot &&
                    item.category === 'method' &&
                    (item.label.toLowerCase().startsWith(lowerPrefix) || item.keywords.some(k => k.startsWith(lowerPrefix)))
                );

                if (matches.length > 0) {
                    const activeDs = this.getCurrentDataStructure(lowerObj);
                    if (activeDs) {
                        matches.sort((a, b) => {
                            const matchA = (a.ds === activeDs || (activeDs === 'stack' && a.id === 'queue-isempty')) ? 1 : 0;
                            const matchB = (b.ds === activeDs || (activeDs === 'stack' && b.id === 'queue-isempty')) ? 1 : 0;
                            return matchB - matchA;
                        });
                    }

                    this.replaceStart = caretPos - memberPrefix.length;
                    this.replaceEnd = caretPos;
                    this.showSuggestions(matches, memberPrefix);
                    return;
                }
            }
        }

        // בדיקה 2: מילה עצמאית שנכתבת (למשל: con, writeline, isempty, getval, getinfo, new, while, rem)
        const wordMatch = currentLine.match(/([a-zA-Z_]\w*)$/);
        if (wordMatch) {
            const word = wordMatch[1];
            const lowerWord = word.toLowerCase();

            // נסנן אם המילה באורך של 2 תווים ומעלה
            if (lowerWord.length >= 2) {
                const matches = this.catalog.filter(item => {
                    if (!item.triggersStandalone) return false;
                    return item.label.toLowerCase().startsWith(lowerWord) ||
                           item.keywords.some(k => k.startsWith(lowerWord));
                });

                if (matches.length > 0) {
                    const activeDs = this.getCurrentDataStructure();
                    if (activeDs) {
                        matches.sort((a, b) => {
                            const matchA = (a.ds === activeDs || (activeDs === 'stack' && a.id === 'queue-isempty')) ? 1 : 0;
                            const matchB = (b.ds === activeDs || (activeDs === 'stack' && b.id === 'queue-isempty')) ? 1 : 0;
                            return matchB - matchA;
                        });
                    }

                    this.replaceStart = caretPos - word.length;
                    this.replaceEnd = caretPos;
                    this.showSuggestions(matches, word);
                    return;
                }
            }
        }

        // אין התאמות -> הסתרת החלון
        this.hide();
    }

    showSuggestions(items, prefix) {
        this.items = items;
        this.currentPrefix = prefix;
        this.selectedIndex = 0;
        this.visible = true;

        this.renderList();
        this.renderDoc(this.items[0]);
        this.updatePosition();
        this.popup.style.display = 'flex';
    }

    renderList() {
        this.listEl.innerHTML = '';
        this.items.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = `autocomplete-item ${idx === this.selectedIndex ? 'active' : ''}`;
            
            let icon = item.icon;
            if (!icon) {
                if (item.category === 'console') icon = '📟';
                else if (item.category === 'class' || item.category === 'instantiation') icon = '📦';
                else if (item.category === 'snippet') icon = '⚡';
                else if (item.ds === 'node') icon = '🔗';
                else if (item.ds === 'binnode') icon = '🌳';
                else if (item.ds === 'stack') icon = '🥞';
                else icon = '🟣';
            }

            el.innerHTML = `
                <span class="item-icon">${icon}</span>
                <span class="item-label">${this.highlightMatch(item.label, this.currentPrefix)}</span>
                <span class="item-badge">${item.typeBadge}</span>
            `;

            el.addEventListener('mouseenter', () => {
                this.selectedIndex = idx;
                this.updateActiveItem();
                this.renderDoc(item);
            });

            el.addEventListener('mousedown', (e) => {
                e.preventDefault(); // מניעת איבוד פוקוס מה-textarea
                this.selectedIndex = idx;
                this.acceptSelected();
            });

            this.listEl.appendChild(el);
        });
    }

    highlightMatch(text, query) {
        if (!query) return text;
        const lower = text.toLowerCase();
        const qLower = query.toLowerCase();
        const startIdx = lower.indexOf(qLower);
        if (startIdx === -1) return text;

        const before = text.substring(0, startIdx);
        const match = text.substring(startIdx, startIdx + query.length);
        const after = text.substring(startIdx + query.length);
        return `${before}<strong>${match}</strong>${after}`;
    }

    renderDoc(item) {
        if (!item) {
            this.docEl.innerHTML = '';
            return;
        }

        let categoryBadge = item.categoryBadge;
        if (!categoryBadge) {
            if (item.ds === 'node') categoryBadge = 'פעולת חוליה (Node)';
            else if (item.ds === 'binnode') categoryBadge = 'פעולת עץ בינארי (BinNode)';
            else if (item.ds === 'stack') categoryBadge = 'פעולת מחסנית (Stack)';
            else if (item.ds === 'queue') categoryBadge = 'פעולת תור (Queue)';
            else if (item.category === 'console') categoryBadge = 'פעולת מסוף (Console)';
            else if (item.category === 'class' || item.category === 'instantiation') categoryBadge = 'מבנה נתונים (Class)';
            else if (item.category === 'snippet') categoryBadge = 'תבנית קוד (Snippet)';
            else categoryBadge = 'פעולה (Method)';
        }

        this.docEl.innerHTML = `
            <div class="doc-header">
                <div class="doc-header-row">
                    <span class="doc-badge">${categoryBadge}</span>
                    <button type="button" class="autocomplete-close-btn" id="autocomplete-close-btn" title="מזער / סגור השלמה אוטומטית (Esc)" aria-label="סגור השלמה אוטומטית">✕</button>
                </div>
                <div class="doc-signature"><code>${item.signature}</code></div>
            </div>
            <div class="doc-body">
                <div class="doc-row">
                    <span class="doc-label">📥 מקבלת:</span>
                    <span class="doc-text">${item.params}</span>
                </div>
                <div class="doc-row">
                    <span class="doc-label">📤 מחזירה:</span>
                    <span class="doc-text">${item.returns}</span>
                </div>
                <div class="doc-row doc-row-desc">
                    <span class="doc-label">💡 הסבר:</span>
                    <span class="doc-text">${item.desc}</span>
                </div>
            </div>
        `;

        const closeBtn = this.docEl.querySelector('.autocomplete-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.hide();
                if (this.textarea) this.textarea.focus();
            });
        }
    }

    updateActiveItem() {
        const items = this.listEl.querySelectorAll('.autocomplete-item');
        items.forEach((el, i) => {
            if (i === this.selectedIndex) {
                el.classList.add('active');
                el.scrollIntoView({ block: 'nearest' });
            } else {
                el.classList.remove('active');
            }
        });
        if (this.items[this.selectedIndex]) {
            this.renderDoc(this.items[this.selectedIndex]);
        }
    }

    selectNext() {
        if (this.items.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.updateActiveItem();
    }

    selectPrev() {
        if (this.items.length === 0) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        this.updateActiveItem();
    }

    acceptSelected() {
        if (!this.visible || this.items.length === 0) return;

        const selectedItem = this.items[this.selectedIndex];
        const val = this.textarea.value;
        const insertText = selectedItem.insertText;

        const newText = val.substring(0, this.replaceStart) + insertText + val.substring(this.replaceEnd);
        this.textarea.value = newText;

        // חישוב מיקום הסמן
        let newCaretPos = this.replaceStart + insertText.length;
        if (selectedItem.cursorOffset !== 0) {
            newCaretPos += selectedItem.cursorOffset;
        }

        this.textarea.setSelectionRange(newCaretPos, newCaretPos);
        this.hide();

        if (this.onAccept) {
            this.onAccept(selectedItem);
        }
    }

    updatePosition() {
        if (!this.visible) return;

        const caretPos = this.textarea.selectionStart;
        const textBeforeCaret = this.textarea.value.substring(0, caretPos);
        const lines = textBeforeCaret.split('\n');
        const lineIdx = lines.length - 1;
        const colIdx = lines[lineIdx].length;

        const lineHeight = 22; // תואם line-height בעורך
        const charWidth = 8.4; // רוחב ממוצע של אות Consolas 14px
        const padding = 16;

        let top = (lineIdx + 1) * lineHeight + padding - this.textarea.scrollTop;
        let left = colIdx * charWidth + padding - this.textarea.scrollLeft;

        const popupWidth = 560;
        const popupHeight = 240;

        // בדיקת גבולות אופקיים
        if (left + popupWidth > this.textarea.clientWidth) {
            left = Math.max(10, this.textarea.clientWidth - popupWidth - 15);
        }
        if (left < 10) left = 10;

        // בדיקת גבולות אנכיים - אם גולש למטה, הצג מעל השורה
        if (top + popupHeight > this.textarea.clientHeight) {
            const topAbove = (lineIdx * lineHeight + padding - this.textarea.scrollTop) - popupHeight - 8;
            if (topAbove > 10) {
                top = topAbove;
            }
        }
        if (top < 10) top = 10;

        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
    }

    hide() {
        this.visible = false;
        this.popup.style.display = 'none';
        this.items = [];
    }
}

// ייצוא
if (typeof window !== 'undefined') {
    window.AutocompleteEngine = AutocompleteEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutocompleteEngine };
}
