/**
 * Autocomplete & IntelliSense Engine with Pedagogical Documentation
 * בית ספר מקיף דוד טוביהו - מגמת מדעי המחשב
 */

class AutocompleteEngine {
    constructor(textarea, popupContainer, onAcceptCallback) {
        this.textarea = textarea;
        this.popup = popupContainer;
        this.listEl = popupContainer.querySelector('#autocomplete-list');
        this.docEl = popupContainer.querySelector('#autocomplete-doc');
        this.onAccept = onAcceptCallback;

        this.visible = false;
        this.items = [];
        this.selectedIndex = 0;
        this.currentPrefix = '';
        this.replaceStart = 0;
        this.replaceEnd = 0;

        this.catalog = this.initCatalog();
        this.bindEvents();
    }

    initCatalog() {
        return [
            {
                id: 'queue-isempty',
                label: 'IsEmpty()',
                insertText: 'IsEmpty()',
                cursorOffset: 0,
                category: 'method',
                typeBadge: 'bool',
                signature: 'public bool IsEmpty()',
                params: 'אין פרמטרים.',
                returns: 'bool — מחזירה true אם התור ריק, או false אם יש בו איבר אחד לפחות.',
                desc: 'בודקת האם התור ריק. שימושית במיוחד בתנאי לולאת while (!q.IsEmpty()) לצורך סריקה ומעבר על כל איברי התור. סיבוכיות זמן ריצה: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['isempty', 'isemp', 'is', 'empty', 'emp']
            },
            {
                id: 'queue-insert',
                label: 'Insert(x)',
                insertText: 'Insert()',
                cursorOffset: -1, // סמן בתוך הסוגריים
                category: 'method',
                typeBadge: 'void',
                signature: 'public void Insert(int x)',
                params: 'int x — הערך להכנסה (מסוג שלם int עבור Queue<int>).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מכניסה את הערך x לסוף התור (Tail). גודל התור גדל ב-1. שומרת על עקרון FIFO (ראשון נכנס, ראשון יוצא). סיבוכיות: O(1).',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['insert', 'ins', 'in', 'add', 'enqueue', 'push']
            },
            {
                id: 'queue-remove',
                label: 'Remove()',
                insertText: 'Remove()',
                cursorOffset: 0,
                category: 'method',
                typeBadge: 'int',
                signature: 'public int Remove()',
                params: 'אין פרמטרים.',
                returns: 'int — הערך שהיה בראש התור והוצא ממנו.',
                desc: 'מוציאה ומחזירה את האיבר הנמצא בראש התור (Head). כל שאר האיברים בתור מתקדמים קדימה. סיבוכיות: O(1). ⚠️ שים לב: הפעולה זורקת שגיאת ריצה (QueueEmptyException) אם התור ריק! תמיד יש לבדוק IsEmpty() לפני קריאה ל-Remove.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['remove', 'rem', 're', 'rm', 'dequeue', 'pop']
            },
            {
                id: 'queue-head',
                label: 'Head()',
                insertText: 'Head()',
                cursorOffset: 0,
                category: 'method',
                typeBadge: 'int',
                signature: 'public int Head()',
                params: 'אין פרמטרים.',
                returns: 'int — הערך הנמצא בראש התור.',
                desc: 'מציצה באיבר שבראש התור (Head) ומחזירה את ערכו מבלי להוציאו ומבלי לשנות את התור. סיבוכיות: O(1). ⚠️ שים לב: הפעולה זורקת שגיאת ריצה (QueueEmptyException) אם התור ריק!',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['head', 'he', 'peek', 'top', 'front']
            },
            {
                id: 'queue-tostring',
                label: 'ToString()',
                insertText: 'ToString()',
                cursorOffset: 0,
                category: 'method',
                typeBadge: 'string',
                signature: 'public string ToString()',
                params: 'אין פרמטרים.',
                returns: 'string — מחרוזת המייצגת את איברי התור.',
                desc: 'מחזירה ייצוג מחרוזתי קריא של כל איברי התור לפי סדרם מראש התור לסופו, לדוגמה: [14, 7, 25]. סיבוכיות: O(n).',
                triggersOnDot: true,
                triggersStandalone: false,
                keywords: ['tostring', 'to', 'str']
            },
            {
                id: 'console-writeline',
                label: 'Console.WriteLine(...)',
                insertText: 'Console.WriteLine()',
                cursorOffset: -1,
                category: 'console',
                typeBadge: 'void',
                signature: 'public static void WriteLine(object value)',
                params: 'ערך, משתנה, מחרוזת, או ביטוי להדפסה (כולל שרשור מחרוזות באמצעות + ותבניות עיצוב כגון {0}).',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מדפיסה את הערך למסוף הפלט (Console Output) של הדיבאגר ויורדת שורה חדשה. מאפשרת מעקב נוח אחר משתנים במהלך ריצת האלגוריתם.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['console.writeline', 'console.wr', 'console.w', 'writeline', 'console', 'cw', 'con', 'print']
            },
            {
                id: 'console-write',
                label: 'Console.Write(...)',
                insertText: 'Console.Write()',
                cursorOffset: -1,
                category: 'console',
                typeBadge: 'void',
                signature: 'public static void Write(object value)',
                params: 'ערך או מחרוזת להדפסה.',
                returns: 'void — אינה מחזירה ערך.',
                desc: 'מדפיסה ערך למסוף הפלט ללא ירידת שורה.',
                triggersOnDot: true,
                triggersStandalone: true,
                keywords: ['console.write', 'write']
            },
            {
                id: 'new-queue',
                label: 'new Queue<int>()',
                insertText: 'new Queue<int>()',
                cursorOffset: 0,
                category: 'class',
                typeBadge: 'Queue<int>',
                signature: 'Queue<int> temp = new Queue<int>();',
                params: 'אין פרמטרים (בנאי ברירת מחדל ריק).',
                returns: 'מופע תור חדש וריק.',
                desc: 'יוצרת מופע חדש וריק של תור שלמים. התור החדש יתווסף ויוצג מיד בחלון מסילת התורים בהמחשה הויזואלית.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new queue', 'new q', 'queue<int>', 'new', 'que']
            },
            {
                id: 'while-queue',
                label: 'while (!q.IsEmpty())',
                insertText: `while (!q.IsEmpty())
    {
        int x = q.Remove();
        
    }`,
                cursorOffset: 0,
                category: 'snippet',
                typeBadge: 'תבנית',
                signature: 'while (!q.IsEmpty())',
                params: 'בדיקת תנאי תור ריק.',
                returns: 'לולאת סריקה.',
                desc: 'תבנית המעבר הסטנדרטית בבגרות לסריקה ועיבוד של כל איברי התור q עד לריקונו המלא (או העברתו לתור עזר temp לשחזור).',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['while', 'while (!q', 'loop', 'scan', 'whi']
            },
            {
                id: 'class-program',
                label: 'public class Program { ... }',
                insertText: `public class Program
{
    public static void Main(Queue<int> q)
    {
        
    }
}`,
                cursorOffset: 0,
                category: 'snippet',
                typeBadge: 'תוכנית ראשית',
                signature: 'public class Program',
                params: 'מחלקה עוטפת ופעולת Main ראשית.',
                returns: 'מבנה תוכנית תקני ב-C#.',
                desc: 'המבנה התקני של תוכנית C# עם מחלקת Program ופעולת כניסה ראשית Main המקבלת את התור q כפרמטר.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['program', 'class program', 'main', 'prog', 'public class program']
            },
            {
                id: 'property-auto',
                label: 'public int X { get; set; }',
                insertText: 'public int X { get; set; }',
                cursorOffset: 0,
                category: 'snippet',
                typeBadge: 'מאפיין (Property)',
                signature: 'public int X { get; set; }',
                params: 'הגדרת מאפיין אוטומטי.',
                returns: 'Getter ו-Setter אוטומטיים.',
                desc: 'הגדרת מאפיין אוטומטי ב-C# (Auto-Property) המספק פעולות אחזור (get) ועדכון (set) מקוצרות עם כימוס מלא.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['prop', 'property', 'get set', 'get; set;', 'getter setter']
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
                typeBadge: 'Get / Set',
                signature: 'public int GetX() / public void SetX(int value)',
                params: 'פעולות גישה ועדכון לשדה פרטי.',
                returns: 'קריאה וכתיבה לשדה פרטי.',
                desc: 'פעולות Get ו-Set סטנדרטיות המאפשרות גישה מבוקרת (כימוס) לשדות private במחלקה.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['getter', 'setter', 'getx', 'setx', 'get', 'set']
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
                typeBadge: 'מחלקה מלאה',
                signature: 'public class Point',
                params: 'שדות private, בנאי, Get/Set, מאפיין Y ו-ToString().',
                returns: 'הגדרת מחלקה עם כימוס מלא.',
                desc: 'תבנית להגדרת מחלקה מותאמת אישית Point לשימוש בתוך Queue<Point>. כוללת שדות פרטיים (private), בנאי, פעולות Get/Set, מאפיין ודריסת ToString(). לאתחול קלט בלשונית אתחול התור יש להזין נקודות בסוגריים: (10, 20), (30, 40).',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['class', 'point', 'custom class', 'cls', 'private', 'public', 'protected']
            },
            {
                id: 'new-queue-point',
                label: 'new Queue<Point>()',
                insertText: 'new Queue<Point>()',
                cursorOffset: 0,
                category: 'instantiation',
                typeBadge: 'Queue<Point>',
                signature: 'public Queue<Point>()',
                params: 'אין פרמטרים.',
                returns: 'מופע תור חדש של נקודות Point.',
                desc: 'יוצרת תור חדש של אובייקטים מסוג Point. כל איבר מוצג ככרטיסיית אובייקט עשירה עם שדות וערכים. פורמט קלט התחלתי: (10, 20), (30, 40) או {x: 10, y: 20}.',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['new queue<point>', 'point queue', 'queue point']
            },
            {
                id: 'new-queue-queue',
                label: 'new Queue<Queue<int>>()',
                insertText: 'new Queue<Queue<int>>()',
                cursorOffset: 0,
                category: 'instantiation',
                typeBadge: 'Queue<Queue<int>>',
                signature: 'public Queue<Queue<int>>()',
                params: 'אין פרמטרים.',
                returns: 'מופע תור של תורים חדש.',
                desc: 'יוצרת תור מקונן של תורים (Queue of Queue). כל איבר בתור הוא בעצמו תור שלם עם מסלול פנימי וחיצי זרימה. פורמט קלט התחלתי: [10, 20], [30, 40], [50, 60].',
                triggersOnDot: false,
                triggersStandalone: true,
                keywords: ['queue<queue', 'new queue<queue', 'queue of queue', 'superq']
            }
        ];
    }

    bindEvents() {
        // סגירת פופאפ בלחיצה מחוץ לעורך
        document.addEventListener('click', (e) => {
            if (this.visible && !this.popup.contains(e.target) && e.target !== this.textarea) {
                this.hide();
            }
        });
    }

    isOpen() {
        return this.visible && this.items.length > 0;
    }

    onInput() {
        const caretPos = this.textarea.selectionStart;
        const textBeforeCaret = this.textarea.value.substring(0, caretPos);
        const currentLine = textBeforeCaret.substring(textBeforeCaret.lastIndexOf('\n') + 1);

        // בדיקה 1: האם המשתמש מקליד אחרי נקודה (Member access, למשל: q.isEmp, temp.in, console.wr)
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
                // אובייקט אחר לפני נקודה (למשל תור q, temp, evens) -> פעולות תור בלבד!
                const matches = this.catalog.filter(item => 
                    item.triggersOnDot &&
                    item.category === 'method' &&
                    (item.label.toLowerCase().startsWith(lowerPrefix) || item.keywords.some(k => k.startsWith(lowerPrefix)))
                );

                if (matches.length > 0) {
                    this.replaceStart = caretPos - memberPrefix.length;
                    this.replaceEnd = caretPos;
                    this.showSuggestions(matches, memberPrefix);
                    return;
                }
            }
        }

        // בדיקה 2: מילה עצמאית שנכתבת (למשל: con, writeline, isempty, new, while, rem)
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
            
            let icon = '🟣';
            if (item.category === 'console') icon = '📟';
            else if (item.category === 'class') icon = '📦';
            else if (item.category === 'snippet') icon = '⚡';

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

        let categoryBadge = 'פעולת תור (Method)';
        if (item.category === 'console') categoryBadge = 'פעולת מסוף (Console)';
        else if (item.category === 'class') categoryBadge = 'מבנה נתונים (Class)';
        else if (item.category === 'snippet') categoryBadge = 'תבנית קוד (Snippet)';

        this.docEl.innerHTML = `
            <div class="doc-header">
                <span class="doc-badge">${categoryBadge}</span>
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

        const popupWidth = 530;
        const popupHeight = 220;

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
