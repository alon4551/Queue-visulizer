/**
 * Queue Visualizer & Debugger UI Controller
 * בית ספר מקיף דוד טוביהו - מגמת מדעי המחשב
 */

class QueueVisualizerApp {
    constructor() {
        this.interpreter = new CSharpQueueInterpreter();
        this.frames = [];
        this.currentFrameIdx = 0;
        this.isPlaying = false;
        this.playTimer = null;
        this.speedMs = 800; // ברירת מחדל
        this.initialQueueType = 'int'; // 'int', 'char', 'string'
        this.initialQueue = [14, 7, 25, 9, 31];

        this.dom = {};
    }

    init() {
        this.cacheDom();
        this.bindEvents();
        this.dom.initialQueueInput.value = this.initialQueue.join(', ');
        this.dom.codeTextarea.value = `public static void Main(Queue<int> q)
{
    
}`;
        this.updateLineNumbers();
        this.recompile();
    }

    cacheDom() {
        this.dom.initialQueueInput = document.getElementById('initial-queue-input');
        this.dom.btnSetQueue = document.getElementById('btn-set-queue');
        this.dom.btnRandomQueue = document.getElementById('btn-random-queue');

        this.dom.codeTextarea = document.getElementById('code-textarea');
        this.dom.codeHighlighter = document.getElementById('code-highlighter');
        this.dom.lineNumbers = document.getElementById('line-numbers');

        this.dom.btnPlay = document.getElementById('btn-play');
        this.dom.btnStepPrev = document.getElementById('btn-step-prev');
        this.dom.btnStepNext = document.getElementById('btn-step-next');
        this.dom.btnReset = document.getElementById('btn-reset');
        this.dom.speedSlider = document.getElementById('speed-slider');
        this.dom.stepCounter = document.getElementById('step-counter');

        this.dom.statusBanner = document.getElementById('status-banner');
        this.dom.statusIcon = document.getElementById('status-icon');
        this.dom.statusText = document.getElementById('status-text');

        this.dom.queuesStage = document.getElementById('queues-stage');
        this.dom.callStackList = document.getElementById('call-stack-list');
        this.dom.variablesTableBody = document.getElementById('variables-tbody');

        this.dom.queueInitCard = document.getElementById('queue-init-card');
        this.dom.queueInitTitle = document.getElementById('queue-init-title');
        this.dom.queueInitBadge = document.getElementById('queue-init-badge');
        this.dom.queueInitHint = document.getElementById('queue-init-hint');
        this.dom.queueInitRow = document.getElementById('queue-init-row');

        this.dom.consoleOutput = document.getElementById('console-output');
        this.dom.consoleCountBadge = document.getElementById('console-count-badge');
        this.dom.consoleCard = document.getElementById('console-card');

        this.dom.controlsCard = document.getElementById('controls-card');
        this.dom.inspectionCard = document.getElementById('inspection-card');

        this.dom.btnToggleInitQueue = document.getElementById('btn-toggle-init-queue');
        this.dom.btnToggleControls = document.getElementById('btn-toggle-controls');
        this.dom.btnToggleStatus = document.getElementById('btn-toggle-status');
        this.dom.btnToggleConsole = document.getElementById('btn-toggle-console');
        this.dom.btnToggleTabs = document.getElementById('btn-toggle-tabs');

        this.dom.queueStageCard = document.getElementById('queue-stage-card');
        this.dom.tabBtnQueueView = document.getElementById('tab-btn-queue-view');
        this.dom.tabBtnQueueInit = document.getElementById('tab-btn-queue-init');
        this.dom.tabPaneQueueView = document.getElementById('tab-pane-queue-view');
        this.dom.tabPaneQueueInit = document.getElementById('tab-pane-queue-init');

        this.dom.tabBtnVars = document.getElementById('tab-btn-vars');
        this.dom.tabBtnStack = document.getElementById('tab-btn-stack');
        this.dom.tabBtnConsole = document.getElementById('tab-btn-console');
        this.dom.tabPaneVars = document.getElementById('tab-pane-vars');
        this.dom.tabPaneStack = document.getElementById('tab-pane-stack');
        this.dom.tabPaneConsole = document.getElementById('tab-pane-console');

        this.dom.exampleCodeSelect = document.getElementById('example-code-select');
        this.dom.autocompletePopup = document.getElementById('autocomplete-popup');

        if (typeof AutocompleteEngine !== 'undefined' && this.dom.autocompletePopup) {
            this.autocomplete = new AutocompleteEngine(
                this.dom.codeTextarea,
                this.dom.autocompletePopup,
                () => {
                    this.updateLineNumbers();
                    this.recompile();
                }
            );
        }
    }

    bindEvents() {
        // עדכון תור התחלתי ידני
        this.dom.btnSetQueue.addEventListener('click', () => {
            this.updateQueueFromInput();
            if (this.switchQueueTab) this.switchQueueTab('queue-view');
        });

        this.dom.initialQueueInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.updateQueueFromInput();
                if (this.switchQueueTab) this.switchQueueTab('queue-view');
            }
        });

        // הגרלת ערכים לתור בהתאם לטיפוס הפעיל
        this.dom.btnRandomQueue.addEventListener('click', () => {
            const randItems = this.generateRandomQueue(this.initialQueueType);
            this.initialQueue = randItems;
            this.dom.initialQueueInput.value = this.formatQueueInputValue(randItems, this.initialQueueType);
            this.recompile();
            if (this.switchQueueTab) this.switchQueueTab('queue-view');
        });

        // עריכת קוד ידנית
        this.dom.codeTextarea.addEventListener('input', () => {
            this.updateLineNumbers();
            this.recompile();
            if (this.autocomplete) {
                this.autocomplete.onInput();
            }
        });

        this.dom.codeTextarea.addEventListener('scroll', () => {
            if (this.autocomplete) {
                this.autocomplete.updatePosition();
            }
        });

        // תמיכה מלאה בהזחת שורות (Tab, Shift+Tab, Enter) בעורך הקוד
        this.dom.codeTextarea.addEventListener('keydown', (e) => {
            // טיפול באירועי מקלדת כאשר חלון ההשלמה האוטומטית פתוח
            if (this.autocomplete && this.autocomplete.isOpen()) {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    this.autocomplete.acceptSelected();
                    return;
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.autocomplete.selectNext();
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.autocomplete.selectPrev();
                    return;
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.autocomplete.hide();
                    return;
                }
            }

            const textarea = this.dom.codeTextarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            const tabSpaces = '    '; // 4 רווחים לפי תקן C#

            if (e.key === 'Tab') {
                e.preventDefault();

                if (start === end && !e.shiftKey) {
                    // סמן בודד - הכנסת 4 רווחים
                    let inserted = false;
                    try {
                        inserted = document.execCommand('insertText', false, tabSpaces);
                    } catch (err) {
                        inserted = false;
                    }
                    if (!inserted) {
                        textarea.setRangeText(tabSpaces, start, end, 'end');
                    }
                } else if (start === end && e.shiftKey) {
                    // ביטול הזחה (Shift+Tab) לשורה הנוכחית
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    const lineText = value.substring(lineStart);
                    const match = lineText.match(/^( {1,4})/);
                    if (match) {
                        const count = match[1].length;
                        textarea.setSelectionRange(lineStart, lineStart + count);
                        let deleted = false;
                        try {
                            deleted = document.execCommand('delete', false);
                        } catch (err) {
                            deleted = false;
                        }
                        if (!deleted) {
                            textarea.setRangeText('', lineStart, lineStart + count, 'end');
                        }
                        const newPos = Math.max(lineStart, start - count);
                        textarea.setSelectionRange(newPos, newPos);
                    }
                } else {
                    // בחירת טווח שורות
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    let lineEnd = value.indexOf('\n', end);
                    if (lineEnd === -1) lineEnd = value.length;

                    const selectedText = value.substring(lineStart, lineEnd);
                    const lines = selectedText.split('\n');

                    if (!e.shiftKey) {
                        // הזחה קדימה לכל השורות המסומנות
                        const newText = lines.map(line => tabSpaces + line).join('\n');
                        textarea.setSelectionRange(lineStart, lineEnd);
                        let replaced = false;
                        try {
                            replaced = document.execCommand('insertText', false, newText);
                        } catch (err) {
                            replaced = false;
                        }
                        if (!replaced) {
                            textarea.setRangeText(newText, lineStart, lineEnd, 'select');
                        } else {
                            textarea.setSelectionRange(start + tabSpaces.length, lineStart + newText.length);
                        }
                    } else {
                        // ביטול הזחה לכל השורות המסומנות (Shift+Tab)
                        let firstLineRemoved = 0;
                        const newText = lines.map((line, idx) => {
                            const match = line.match(/^( {1,4})/);
                            if (match) {
                                if (idx === 0) firstLineRemoved = match[1].length;
                                return line.substring(match[1].length);
                            }
                            return line;
                        }).join('\n');

                        textarea.setSelectionRange(lineStart, lineEnd);
                        let replaced = false;
                        try {
                            replaced = document.execCommand('insertText', false, newText);
                        } catch (err) {
                            replaced = false;
                        }
                        if (!replaced) {
                            textarea.setRangeText(newText, lineStart, lineEnd, 'select');
                        } else {
                            textarea.setSelectionRange(Math.max(lineStart, start - firstLineRemoved), lineStart + newText.length);
                        }
                    }
                }

                this.updateLineNumbers();
                this.recompile();
            } else if (e.key === 'Enter') {
                // שימור רמת ההזחה הנוכחית בירידת שורה
                if (start === end) {
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    const currentLine = value.substring(lineStart, start);
                    const indentMatch = currentLine.match(/^(\s+)/);
                    if (indentMatch && indentMatch[1].length > 0) {
                        e.preventDefault();
                        const indent = indentMatch[1];
                        const insertStr = '\n' + indent;
                        let inserted = false;
                        try {
                            inserted = document.execCommand('insertText', false, insertStr);
                        } catch (err) {
                            inserted = false;
                        }
                        if (!inserted) {
                            textarea.setRangeText(insertStr, start, end, 'end');
                        }
                        this.updateLineNumbers();
                        this.recompile();
                    }
                }
            }
        });

        // סנכרון גלילה בין textarea ל-highlighter ולמספרי השורות
        this.dom.codeTextarea.addEventListener('scroll', () => {
            this.dom.codeHighlighter.scrollTop = this.dom.codeTextarea.scrollTop;
            this.dom.codeHighlighter.scrollLeft = this.dom.codeTextarea.scrollLeft;
            this.dom.lineNumbers.scrollTop = this.dom.codeTextarea.scrollTop;
        });

        // כפתורי שליטה
        this.dom.btnPlay.addEventListener('click', () => {
            if (this.dom.tabPaneQueueInit && this.dom.tabPaneQueueInit.classList.contains('active')) {
                if (this.switchQueueTab) this.switchQueueTab('queue-view');
            }
            this.togglePlay();
        });
        this.dom.btnStepNext.addEventListener('click', () => {
            if (this.dom.tabPaneQueueInit && this.dom.tabPaneQueueInit.classList.contains('active')) {
                if (this.switchQueueTab) this.switchQueueTab('queue-view');
            }
            this.stepNext();
        });
        this.dom.btnStepPrev.addEventListener('click', () => this.stepPrev());
        this.dom.btnReset.addEventListener('click', () => this.reset());

        // שינוי מהירות
        this.dom.speedSlider.addEventListener('input', (e) => {
            // Slider value 1 (slow, 1600ms) to 10 (fast, 150ms)
            const val = Number(e.target.value);
            this.speedMs = Math.round(1700 - (val * 155));
            if (this.isPlaying) {
                this.pause();
                this.play();
            }
        });

        // קיצורי מקלדת שימושיים
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === this.dom.codeTextarea ||
                document.activeElement === this.dom.initialQueueInput) {
                return;
            }
            if (e.key === 'ArrowLeft') { // בעברית ArrowLeft = קדימה
                this.stepNext();
            } else if (e.key === 'ArrowRight') { // ArrowRight = אחורה
                this.stepPrev();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.togglePlay();
            }
        });

        // מעבר בין כרטיסיות במת התור (Queue View vs Init Queue)
        const switchQueueTab = (tabName) => {
            if (tabName === 'queue-view') {
                if (this.dom.tabBtnQueueView) this.dom.tabBtnQueueView.classList.add('active');
                if (this.dom.tabBtnQueueInit) this.dom.tabBtnQueueInit.classList.remove('active');
                if (this.dom.tabPaneQueueView) this.dom.tabPaneQueueView.classList.add('active');
                if (this.dom.tabPaneQueueInit) this.dom.tabPaneQueueInit.classList.remove('active');
            } else if (tabName === 'queue-init') {
                if (this.dom.tabBtnQueueInit) this.dom.tabBtnQueueInit.classList.add('active');
                if (this.dom.tabBtnQueueView) this.dom.tabBtnQueueView.classList.remove('active');
                if (this.dom.tabPaneQueueInit) this.dom.tabPaneQueueInit.classList.add('active');
                if (this.dom.tabPaneQueueView) this.dom.tabPaneQueueView.classList.remove('active');
            }
        };
        this.switchQueueTab = switchQueueTab;
        window.switchQueueTab = switchQueueTab;

        if (this.dom.tabBtnQueueView) {
            this.dom.tabBtnQueueView.addEventListener('click', () => switchQueueTab('queue-view'));
        }
        if (this.dom.tabBtnQueueInit) {
            this.dom.tabBtnQueueInit.addEventListener('click', () => switchQueueTab('queue-init'));
        }

        // מעבר בין כרטיסיות מעקב ופלט (Tabs: מעקב משתנים / מחסנית קריאות / מסוף פלט)
        const switchInspectionTab = (tabName) => {
            const tabs = [
                { name: 'vars', btn: this.dom.tabBtnVars, pane: this.dom.tabPaneVars },
                { name: 'stack', btn: this.dom.tabBtnStack, pane: this.dom.tabPaneStack },
                { name: 'console', btn: this.dom.tabBtnConsole, pane: this.dom.tabPaneConsole }
            ];

            tabs.forEach(t => {
                if (t.name === tabName) {
                    if (t.btn) {
                        t.btn.classList.add('active');
                        t.btn.classList.remove('tab-has-new');
                    }
                    if (t.pane) t.pane.classList.add('active');
                } else {
                    if (t.btn) t.btn.classList.remove('active');
                    if (t.pane) t.pane.classList.remove('active');
                }
            });
        };
        this.switchInspectionTab = switchInspectionTab;
        window.switchInspectionTab = switchInspectionTab;

        if (this.dom.tabBtnVars) {
            this.dom.tabBtnVars.addEventListener('click', () => switchInspectionTab('vars'));
        }
        if (this.dom.tabBtnStack) {
            this.dom.tabBtnStack.addEventListener('click', () => switchInspectionTab('stack'));
        }
        if (this.dom.tabBtnConsole) {
            this.dom.tabBtnConsole.addEventListener('click', () => switchInspectionTab('console'));
        }

        // האזנה מואצלת ללחיצות על כרטיסיות (Event Delegation)
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest ? e.target.closest('.tab-btn') : null;
            if (!tabBtn) return;
            const tabName = tabBtn.getAttribute('data-tab');
            if (!tabName) return;

            if (tabName === 'queue-view' || tabName === 'queue-init') {
                switchQueueTab(tabName);
            } else if (tabName === 'vars' || tabName === 'stack' || tabName === 'console') {
                switchInspectionTab(tabName);
            }
        });

        // פקדי מזעור / הרחבה (Minimize / Expand toggles)
        const setupMinimizeToggle = (btn, targetEl) => {
            if (!btn || !targetEl) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                targetEl.classList.toggle('collapsed');
            });
        };

        setupMinimizeToggle(this.dom.btnToggleInitQueue, this.dom.queueStageCard || this.dom.queueInitCard);
        setupMinimizeToggle(this.dom.btnToggleControls, this.dom.controlsCard);
        setupMinimizeToggle(this.dom.btnToggleStatus, this.dom.statusBanner);
        setupMinimizeToggle(this.dom.btnToggleTabs, this.dom.inspectionCard);

        // טעינת דוגמאות קוד מוכנות (Presets)
        if (this.dom.exampleCodeSelect) {
            this.dom.exampleCodeSelect.addEventListener('change', (e) => {
                const choice = e.target.value;
                if (!choice) return;

                if (choice === 'basic') {
                    this.dom.codeTextarea.value = `// מציאת ערך מקסימלי בתור של מספרים
public static int FindMax(Queue<int> q)
{
    Queue<int> temp = new Queue<int>();
    int maxVal = q.Head();

    while (!q.IsEmpty())
    {
        int x = q.Remove();
        Console.WriteLine("בודק איבר: " + x);
        if (x > maxVal)
        {
            maxVal = x;
        }
        temp.Insert(x);
    }

    // שחזור התור המקורי (שמירה על כלל הברזל בבגרות)
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    Console.WriteLine("המקסימום שנמצא: " + maxVal);
    return maxVal;
}

public static void Main(Queue<int> q)
{
    int max = FindMax(q);
}`;
                    this.initialQueueType = 'int';
                    this.initialQueue = [14, 7, 25, 9, 31];
                } else if (choice === 'chars') {
                    this.dom.codeTextarea.value = `// ספירת מופעים של תו מסוים בתור של תווים
public static int CountChar(Queue<char> q, char target)
{
    Queue<char> temp = new Queue<char>();
    int count = 0;

    while (!q.IsEmpty())
    {
        char c = q.Remove();
        if (c == target)
        {
            count++;
        }
        temp.Insert(c);
    }

    // שחזור התור המקורי
    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    Console.WriteLine("התו '" + target + "' נמצא " + count + " פעמים");
    return count;
}

public static void Main(Queue<char> q)
{
    CountChar(q, 'a');
}`;
                    this.initialQueueType = 'char';
                    this.initialQueue = ['a', 'b', 'a', 'c', 'a', 'd'];
                } else if (choice === 'strings') {
                    this.dom.codeTextarea.value = `// שרשור שמות מתור של מחרוזות
public static string JoinNames(Queue<string> q)
{
    Queue<string> temp = new Queue<string>();
    string result = "";

    while (!q.IsEmpty())
    {
        string name = q.Remove();
        Console.WriteLine("שולף שם: " + name);
        result = result + name + " ";
        temp.Insert(name);
    }

    while (!temp.IsEmpty())
    {
        q.Insert(temp.Remove());
    }

    Console.WriteLine("תוצאת השרשור: " + result);
    return result;
}

public static void Main(Queue<string> q)
{
    JoinNames(q);
}`;
                    this.initialQueueType = 'string';
                    this.initialQueue = ['Dana', 'Alon', 'Maya', 'Noam'];
                } else if (choice === 'class-point') {
                    this.dom.codeTextarea.value = `// שימוש במחלקה מותאמת אישית Point בתוך תור Queue<Point>
class Point
{
    public int x;
    public int y;

    public Point(int x, int y)
    {
        this.x = x;
        this.y = y;
    }

    public override string ToString()
    {
        return "(" + this.x + ", " + this.y + ")";
    }
}

class Program
{
    public static void Main(Queue<Point> q)
    {
        Queue<Point> temp = new Queue<Point>();

        while (!q.IsEmpty())
        {
            Point p = q.Remove();
            Console.WriteLine("נקודה שנשלפה: " + p.ToString() + " (x=" + p.x + ", y=" + p.y + ")");
            temp.Insert(p);
        }

        while (!temp.IsEmpty())
        {
            q.Insert(temp.Remove());
        }
    }
}`;
                    this.initialQueueType = 'Point';
                    this.initialQueue = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
                } else if (choice === 'queue-of-queues') {
                    this.dom.codeTextarea.value = `// עבודה עם תור של תורים Queue<Queue<int>>
class Program
{
    public static void Main(Queue<Queue<int>> superQ)
    {
        Queue<Queue<int>> tempSuper = new Queue<Queue<int>>();
        int grandTotal = 0;

        while (!superQ.IsEmpty())
        {
            Queue<int> subQ = superQ.Remove();
            Console.WriteLine("מעבד תור פנימי: " + subQ.ToString());

            int subSum = 0;
            Queue<int> tempSub = new Queue<int>();

            while (!subQ.IsEmpty())
            {
                int val = subQ.Remove();
                subSum = subSum + val;
                tempSub.Insert(val);
            }

            // שחזור התור הפנימי
            while (!tempSub.IsEmpty())
            {
                subQ.Insert(tempSub.Remove());
            }

            Console.WriteLine("סכום התור הפנימי: " + subSum);
            grandTotal = grandTotal + subSum;
            tempSuper.Insert(subQ);
        }

        // שחזור תור התורים
        while (!tempSuper.IsEmpty())
        {
            superQ.Insert(tempSuper.Remove());
        }

        Console.WriteLine("סכום כולל של כל התורים: " + grandTotal);
    }
}`;
                    this.initialQueueType = 'Queue<int>';
                    this.initialQueue = [[10, 20], [30, 40, 50], [60]];
                }

                if (this.dom.initialQueueInput) {
                    this.dom.initialQueueInput.value = this.formatQueueInputValue(this.initialQueue, this.initialQueueType);
                }
                this.updateLineNumbers();
                this.recompile();
                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                e.target.value = '';
            });
        }
    }

    parseQueueInput(raw, targetType = 'int') {
        raw = (raw || '').trim();
        if (!raw) return [];

        if (targetType === 'Point') {
            const points = [];
            const regex = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
            let m;
            while ((m = regex.exec(raw)) !== null) {
                points.push({ x: Number(m[1]), y: Number(m[2]) });
            }
            if (points.length === 0) {
                throw new Error("עבור Queue<Point> יש להזין נקודות בסוגריים, לדוגמה: (10, 20), (30, 40), (50, 60)");
            }
            return points;
        }

        if (targetType.startsWith('Queue')) {
            const subTypeMatch = targetType.match(/^Queue<(.+)>$/);
            const subType = subTypeMatch ? subTypeMatch[1].trim() : 'int';
            const subQueues = [];
            const regex = /\[([^\]]+)\]/g;
            let m;
            while ((m = regex.exec(raw)) !== null) {
                const innerParsed = this.parseQueueInput(m[1], subType);
                subQueues.push(innerParsed);
            }
            if (subQueues.length === 0) {
                throw new Error("עבור תור של תורים Queue<Queue<...>> יש להזין תורים פנימיים בסוגריים מרובעים, לדוגמה: [10, 20], [30, 40]");
            }
            return subQueues;
        }

        const rawItems = raw.split(',').map(s => s.trim()).filter(Boolean);
        if (rawItems.length === 0) return [];

        if (targetType === 'int') {
            const numbers = [];
            for (let item of rawItems) {
                const num = Number(item);
                if (isNaN(num)) {
                    throw new Error(`הערך '${item}' אינו מספר שלם חוקי. עבור Queue<int> אנא הזן מספרים שלמים (לדוגמה: 14, 7, 25, 9).`);
                }
                numbers.push(Math.trunc(num));
            }
            return numbers;
        }

        if (targetType === 'char') {
            const chars = [];
            for (let item of rawItems) {
                let clean = item;
                if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
                    clean = clean.slice(1, -1);
                }
                if (clean.length === 0) continue;
                if (clean.length > 1) {
                    throw new Error(`הערך '${item}' מכיל יותר מתו יחיד. עבור Queue<char> יש להזין תווים בודדים (לדוגמה: 'a', 'b', 'c' או a, b, c).`);
                }
                chars.push(clean);
            }
            return chars;
        }

        if (targetType === 'string') {
            const strings = [];
            for (let item of rawItems) {
                let clean = item;
                if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
                    clean = clean.slice(1, -1);
                }
                strings.push(clean);
            }
            return strings;
        }

        // ברירת מחדל
        return rawItems;
    }

    generateRandomQueue(type = 'int') {
        const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 items
        if (type === 'Point') {
            const points = [];
            for (let i = 0; i < 3; i++) {
                points.push({
                    x: Math.floor(Math.random() * 20) + 1,
                    y: Math.floor(Math.random() * 20) + 1
                });
            }
            return points;
        } else if (type.startsWith('Queue')) {
            const subTypeMatch = type.match(/^Queue<(.+)>$/);
            const subType = subTypeMatch ? subTypeMatch[1].trim() : 'int';
            const subQueues = [];
            for (let i = 0; i < 3; i++) {
                subQueues.push(this.generateRandomQueue(subType).slice(0, 3));
            }
            return subQueues;
        } else if (type === 'char') {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const chars = [];
            for (let i = 0; i < count; i++) {
                chars.push(letters[Math.floor(Math.random() * letters.length)]);
            }
            return chars;
        } else if (type === 'string') {
            const words = [
                'apple', 'banana', 'orange', 'grape', 'lemon', 'melon', 'peach',
                'David', 'Sarah', 'Noam', 'Tamar', 'Alon', 'Maya', 'Eitan',
                'alpha', 'beta', 'gamma', 'delta', 'omega'
            ];
            const pool = [...words].sort(() => 0.5 - Math.random());
            return pool.slice(0, count);
        } else {
            // int
            const numbers = [];
            for (let i = 0; i < count; i++) {
                numbers.push(Math.floor(Math.random() * 90) + 10);
            }
            return numbers;
        }
    }

    formatQueueInputValue(items, type = 'int') {
        if (!items || items.length === 0) return '';
        if (type === 'Point') {
            return items.map(p => `(${p.x}, ${p.y})`).join(', ');
        }
        if (type.startsWith('Queue')) {
            const subTypeMatch = type.match(/^Queue<(.+)>$/);
            const subType = subTypeMatch ? subTypeMatch[1].trim() : 'int';
            return items.map(subArr => `[${this.formatQueueInputValue(subArr, subType)}]`).join(', ');
        }
        if (type === 'char') {
            return items.map(c => `'${c}'`).join(', ');
        }
        if (type === 'string') {
            return items.map(s => `"${s}"`).join(', ');
        }
        return items.join(', ');
    }

    updateQueueFromInput() {
        try {
            const parsed = this.parseQueueInput(this.dom.initialQueueInput.value, this.initialQueueType);
            if (parsed.length > 0) {
                this.initialQueue = parsed;
                this.recompile();
            } else {
                alert('אנא הזן לפחות איבר אחד לתור ההתחלתי.');
            }
        } catch (err) {
            alert(err.message);
        }
    }

    updateLineNumbers() {
        const code = this.dom.codeTextarea.value;
        const lineCount = code.split('\n').length;
        let numbersHtml = '';
        for (let i = 1; i <= lineCount; i++) {
            numbersHtml += `<span class="line-number-item" id="line-num-${i}">${i}</span>`;
        }
        this.dom.lineNumbers.innerHTML = numbersHtml;
    }

    recompile() {
        this.pause();
        const code = this.dom.codeTextarea.value;
        const result = this.interpreter.run(code, this.initialQueue);

        this.frames = result.frames;
        this.currentFrameIdx = 0;

        // עדכון כרטיס התור ההתחלתי בהתאם לזיהוי פרמטר Queue בארגומנטים
        this.updateQueueInitUI(result);

        this.renderCurrentFrame();
    }

    updateQueueInitUI(result) {
        if (!this.dom.queueInitCard) return;

        if (result && result.hasInitialQueue) {
            this.dom.queueInitCard.classList.remove('inactive');
            const qName = result.initialQueueName || 'q';
            const qType = result.initialQueueType || 'int';

            // אם הטיפוס השתנה בקוד (למשל מ-int ל-char, string, Point או Queue<T>)
            if (qType !== this.initialQueueType) {
                this.initialQueueType = qType;
                if (qType === 'char') {
                    this.initialQueue = ['a', 'b', 'c', 'd', 'e'];
                } else if (qType === 'string') {
                    this.initialQueue = ['apple', 'banana', 'cherry', 'date'];
                } else if (qType === 'Point') {
                    this.initialQueue = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
                } else if (qType.startsWith('Queue')) {
                    this.initialQueue = [[10, 20], [30, 40], [50, 60]];
                } else {
                    this.initialQueue = [14, 7, 25, 9, 31];
                }
                if (this.dom.initialQueueInput) {
                    this.dom.initialQueueInput.value = this.formatQueueInputValue(this.initialQueue, qType);
                }
            }

            if (this.dom.queueInitTitle) {
                this.dom.queueInitTitle.innerHTML = `משתנה התור ההתחלתי: <code>Queue&lt;${qType}&gt; ${qName}</code>`;
            }
            if (this.dom.queueInitBadge) {
                this.dom.queueInitBadge.textContent = `קלט פעיל ל-${qName} (${qType})`;
                this.dom.queueInitBadge.className = 'badge badge-active';
            }
            if (this.dom.queueInitHint) {
                let typeHeb = 'מספרים שלמים int';
                if (qType === 'char') typeHeb = "תווים יחידים char (למשל: 'a', 'b', 'c')";
                else if (qType === 'string') typeHeb = 'מחרוזות string (למשל: "hello", "world")';
                else if (qType === 'Point') typeHeb = 'נקודות Point (למשל: (10, 20), (30, 40))';
                else if (qType.startsWith('Queue')) typeHeb = 'תור מקונן של תורים (למשל: [10, 20], [30, 40])';
                this.dom.queueInitHint.innerHTML = `ערכי התור ההתחלתי (${typeHeb}) מועברים ישירות כפרמטר <code>${qName}</code> לפעולת הכניסה בעורך.`;
            }
            if (this.dom.initialQueueInput) {
                this.dom.initialQueueInput.disabled = false;
                if (qType === 'char') this.dom.initialQueueInput.placeholder = "לדוגמה: 'a', 'b', 'c', 'd' או a, b, c, d";
                else if (qType === 'string') this.dom.initialQueueInput.placeholder = 'לדוגמה: "Dana", "Alon", "Ron" או Dana, Alon, Ron';
                else if (qType === 'Point') this.dom.initialQueueInput.placeholder = 'לדוגמה: (10, 20), (30, 40), (50, 60)';
                else if (qType.startsWith('Queue')) this.dom.initialQueueInput.placeholder = 'לדוגמה: [10, 20], [30, 40], [50, 60]';
                else this.dom.initialQueueInput.placeholder = "לדוגמה: 14, 7, 25, 9, 31";
            }
            if (this.dom.btnSetQueue) this.dom.btnSetQueue.disabled = false;
            if (this.dom.btnRandomQueue) this.dom.btnRandomQueue.disabled = false;
        } else {
            this.dom.queueInitCard.classList.add('inactive');
            if (this.dom.queueInitTitle) {
                this.dom.queueInitTitle.innerHTML = `משתנה תור התחלתי`;
            }
            if (this.dom.queueInitBadge) {
                this.dom.queueInitBadge.textContent = `לא נדרש (אין פרמטר Queue)`;
                this.dom.queueInitBadge.className = 'badge badge-inactive';
            }
            if (this.dom.queueInitHint) {
                this.dom.queueInitHint.innerHTML = `💡 פעולת הכניסה אינה מקבלת פרמטר תור. תורים חדשים ייווצרו ויוצגו בחלון ההמחשה בעת שימוש ב-<code>new Queue&lt;T&gt;()</code> בקוד.`;
            }
            if (this.dom.initialQueueInput) this.dom.initialQueueInput.disabled = true;
            if (this.dom.btnSetQueue) this.dom.btnSetQueue.disabled = true;
            if (this.dom.btnRandomQueue) this.dom.btnRandomQueue.disabled = true;
        }
    }

    renderCurrentFrame() {
        if (!this.frames || this.frames.length === 0) return;

        const frame = this.frames[this.currentFrameIdx];
        const total = this.frames.length;

        // 1. עדכון מונה צעדים
        this.dom.stepCounter.textContent = `צעד ${this.currentFrameIdx + 1} / ${total}`;

        // 2. כפתורי צעד קדימה/אחורה
        this.dom.btnStepPrev.disabled = this.currentFrameIdx === 0;
        this.dom.btnStepNext.disabled = this.currentFrameIdx === total - 1;

        if (this.currentFrameIdx === total - 1 && this.isPlaying) {
            this.pause();
        }

        // 3. הדגשת שורה בעורך הקוד
        this.renderEditorHighlight(frame.line, Boolean(frame.error));

        // 4. עדכון סרגל משוב פדגוגי בעברית
        this.renderStatusBanner(frame);

        // 5. רינדור מסלולי התורים
        this.renderQueues(frame.queues, frame);

        // 6. עדכון מחסנית קריאות (Call Stack)
        this.renderCallStack(frame.callStack);

        // 7. עדכון טבלת משתנים (Variables Watch)
        this.renderVariables(frame.variables);

        // 8. עדכון מסוף פלט (Console Output)
        this.renderConsole(frame.consoleOutputs);
    }

    renderEditorHighlight(activeLine, isError) {
        const code = this.dom.codeTextarea.value;
        const lineCount = code.split('\n').length;
        let html = '';

        for (let i = 1; i <= lineCount; i++) {
            const lineNum = i;
            const lineEl = document.getElementById(`line-num-${lineNum}`);
            if (lineEl) {
                lineEl.className = 'line-number-item';
            }

            if (lineNum === activeLine) {
                const cls = isError ? 'error-line' : 'active-line';
                html += `<div class="code-line-highlight ${cls}"></div>`;
                if (lineEl) {
                    lineEl.classList.add(isError ? 'error-line-num' : 'active-line-num');
                }
            } else {
                html += `<div class="code-line-highlight"></div>`;
            }
        }

        this.dom.codeHighlighter.innerHTML = html;

        // גלילה אוטומטית לשורה הפעילה במידת הצורך
        if (activeLine > 0) {
            const lineHeight = 22;
            const targetScroll = Math.max(0, (activeLine - 4) * lineHeight);
            if (Math.abs(this.dom.codeTextarea.scrollTop - targetScroll) > 150) {
                this.dom.codeTextarea.scrollTop = targetScroll;
            }
        }
    }

    renderStatusBanner(frame) {
        this.dom.statusBanner.className = 'status-banner';

        if (frame.error) {
            this.dom.statusBanner.classList.add('error');
            this.dom.statusIcon.textContent = '❌';
            this.dom.statusText.textContent = frame.error;
        } else if (frame.isCompleted) {
            if (frame.originalPreserved === true) {
                this.dom.statusBanner.classList.add('success');
                this.dom.statusIcon.textContent = '🎉';
                this.dom.statusText.textContent = frame.description;
            } else {
                this.dom.statusBanner.classList.add('warning');
                this.dom.statusIcon.textContent = '⚠️';
                this.dom.statusText.textContent = frame.description;
            }
        } else {
            this.dom.statusBanner.classList.add('info');
            this.dom.statusIcon.textContent = '⚡';
            this.dom.statusText.textContent = frame.description;
        }
    }

    renderQueues(queues, frame) {
        this.dom.queuesStage.innerHTML = '';

        if (!queues || queues.length === 0) {
            this.dom.queuesStage.innerHTML = `
                <div class="queue-empty-stage">
                    <span class="empty-stage-icon">📦</span>
                    <p class="empty-stage-title">אין תורים פעילים כעת בחלון</p>
                    <p class="empty-stage-desc">תורים חדשים ייווצרו ויוצגו כאן בעת הרצת <code>new Queue&lt;int&gt;()</code> בקוד, או כאשר פעולת <code>Main</code> מקבלת תור כפרמטר.</p>
                </div>
            `;
            return;
        }

        queues.forEach((q) => {
            const trackCard = document.createElement('div');
            trackCard.className = 'queue-track-card';
            if (q.lastOp && q.lastOp !== 'none') {
                trackCard.classList.add('active-target');
            }

            // צבע ייעודי לתור
            let queueBadgeColor = '#2563eb';
            if (q.name === 'temp' || q.name.startsWith('temp')) queueBadgeColor = '#ea580c';
            else if (q.name === 'evens') queueBadgeColor = '#059669';
            else if (q.name === 'odds') queueBadgeColor = '#7c3aed';

            trackCard.innerHTML = `
                <div class="queue-track-header">
                    <div class="queue-name-tag">
                        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${queueBadgeColor}"></span>
                        <span>Queue&lt;${q.itemType || 'int'}&gt; <strong>${q.name}</strong></span>
                    </div>
                    <div class="queue-length-badge">כמות איברים: <strong>${q.items.length}</strong></div>
                </div>

                <!-- סרגל קצוות מעל המסילה - אינו נדרס על ידי האיברים -->
                <div class="queue-endpoints-bar">
                    <div class="endpoint-marker head-marker">
                        <span>🚪 ראש התור (Head) — יציאה / Remove</span>
                    </div>
                    <div class="endpoint-flow-indicator">
                        <span class="flow-arrows">◀◀◀</span>
                        <span>כיוון התקדמות FIFO</span>
                        <span class="flow-arrows">◀◀◀</span>
                    </div>
                    <div class="endpoint-marker tail-marker">
                        <span>סוף התור (Tail) — כניסה / Insert 📥</span>
                    </div>
                </div>

                <!-- מסילת התור עם שערים פיזיים נפרדים -->
                <div class="queue-horizontal-track">
                    <div class="track-gate gate-head" title="ראש התור (Head) - כאן מבוצע Remove ו-Head">
                        <span class="gate-icon">◀ 🚪</span>
                        <span class="gate-title">Head</span>
                        <span class="gate-action">Remove (שליפה)</span>
                    </div>
                    <div class="queue-elements-flow" id="flow-${q.name}"></div>
                    <div class="track-gate gate-tail" title="סוף התור (Tail) - כאן מבוצע Insert">
                        <span class="gate-icon">📥 ◀</span>
                        <span class="gate-title">Tail</span>
                        <span class="gate-action">Insert (הכנסה)</span>
                    </div>
                </div>
            `;

            const flowContainer = trackCard.querySelector(`#flow-${q.name}`);

            if (q.items.length === 0) {
                flowContainer.innerHTML = '<div class="queue-empty-msg">[ תור ריק ]</div>';
            } else {
                q.items.forEach((itemVal, idx) => {
                    const node = document.createElement('div');
                    node.className = 'queue-node';
                    node.style.background = `linear-gradient(135deg, ${queueBadgeColor} 0%, #1e293b 100%)`;

                    const isHead = idx === 0;
                    const isTail = idx === q.items.length - 1;

                    if (isHead) {
                        node.classList.add('head-node');
                        if (q.lastOp === 'head') {
                            node.classList.add('anim-head');
                        }
                    }
                    if (isTail) {
                        node.classList.add('tail-node');
                        let isTarget = (itemVal === q.targetVal);
                        if (!isTarget && itemVal && q.targetVal && typeof itemVal === 'object' && typeof q.targetVal === 'object') {
                            if (itemVal.isClass && q.targetVal.isClass && itemVal.className === q.targetVal.className) isTarget = true;
                            if (itemVal.isQueue && q.targetVal.isQueue) isTarget = true;
                        }
                        if (q.lastOp === 'insert' && isTarget) {
                            node.classList.add('anim-insert');
                        }
                    }

                    let innerContentHtml = '';

                    if (itemVal && typeof itemVal === 'object' && itemVal.isClass) {
                        node.classList.add('node-complex', 'node-custom-class');
                        const fieldsHtml = Object.entries(itemVal.fields || {})
                            .map(([k, v]) => `<div class="field-item"><span class="field-key">${k}:</span> <strong class="field-val">${v}</strong></div>`)
                            .join('');

                        let toStrHtml = '';
                        if (itemVal.toStringVal && !itemVal.toStringVal.startsWith(itemVal.className + ' {')) {
                            toStrHtml = `<div class="class-card-tostring" title="ToString()">${itemVal.toStringVal}</div>`;
                        }

                        innerContentHtml = `
                            <div class="custom-class-card">
                                <div class="class-card-header">
                                    <span class="class-icon">📦</span>
                                    <span class="class-title">${itemVal.className}</span>
                                </div>
                                <div class="class-card-fields">${fieldsHtml}</div>
                                ${toStrHtml}
                            </div>
                        `;
                    } else if (itemVal && typeof itemVal === 'object' && itemVal.isQueue) {
                        node.classList.add('node-complex', 'node-nested-queue');
                        const subCount = itemVal.items ? itemVal.items.length : 0;
                        let subItemsHtml = '';
                        if (subCount === 0) {
                            subItemsHtml = '<span class="nested-q-empty">[ תור ריק ]</span>';
                        } else {
                            subItemsHtml = `
                                <div class="nested-q-flow">
                                    <span class="nested-gate-label">H</span>
                                    ${itemVal.items.map((subIt, sIdx) => {
                                        let text = (subIt && typeof subIt === 'object') ? (subIt.isClass ? subIt.className : 'Queue') : subIt;
                                        return `<span class="nested-sub-item">${text}</span>` + (sIdx < itemVal.items.length - 1 ? '<span class="nested-arrow">◀</span>' : '');
                                    }).join('')}
                                    <span class="nested-gate-label">T</span>
                                </div>
                            `;
                        }

                        innerContentHtml = `
                            <div class="nested-queue-card">
                                <div class="nested-q-header">
                                    <span class="nested-q-icon">🔄</span>
                                    <span class="nested-q-title">Queue&lt;${itemVal.itemType || 'int'}&gt;</span>
                                    <span class="nested-q-count">(${subCount})</span>
                                </div>
                                <div class="nested-q-body">${subItemsHtml}</div>
                            </div>
                        `;
                    } else {
                        let displayVal = itemVal;
                        let valClass = 'node-val';
                        if (typeof itemVal === 'string') {
                            if (q.itemType === 'char') {
                                displayVal = `'${itemVal}'`;
                                valClass += ' val-char';
                            } else {
                                displayVal = `"${itemVal}"`;
                                valClass += ' val-string';
                                node.classList.add('node-string');
                            }
                        }
                        innerContentHtml = `<span class="${valClass}" title="${itemVal}">${displayVal}</span>`;
                    }

                    node.innerHTML = `
                        ${isTail ? '<span class="node-role-badge badge-tail">סוף (Tail)</span>' : ''}
                        ${innerContentHtml}
                        ${isHead ? '<span class="node-role-badge badge-head">ראש (Head)</span>' : ''}
                    `;

                    flowContainer.appendChild(node);
                });
            }

            this.dom.queuesStage.appendChild(trackCard);
        });
    }

    renderCallStack(callStack) {
        this.dom.callStackList.innerHTML = '';
        if (!callStack || callStack.length === 0) {
            this.dom.callStackList.innerHTML = '<div class="watch-empty">מחסנית ריקה</div>';
            return;
        }

        // הצגה מלמעלה למטה (Top of stack ראשון)
        for (let i = callStack.length - 1; i >= 0; i--) {
            const frame = callStack[i];
            const item = document.createElement('div');
            item.className = 'call-stack-item';
            if (i === callStack.length - 1) {
                item.classList.add('active');
            }
            item.innerHTML = `
                <span><strong>${frame.funcName}</strong></span>
                <span class="badge">שורה ${frame.line}</span>
            `;
            this.dom.callStackList.appendChild(item);
        }
    }

    renderVariables(variables) {
        this.dom.variablesTableBody.innerHTML = '';
        const keys = Object.keys(variables || {});

        if (keys.length === 0) {
            this.dom.variablesTableBody.innerHTML = `<tr><td colspan="2" class="watch-empty">אין משתנים מקומיים</td></tr>`;
            return;
        }

        keys.forEach(varName => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="var-name">${varName}</td>
                <td>${variables[varName]}</td>
            `;
            this.dom.variablesTableBody.appendChild(row);
        });
    }

    renderConsole(consoleOutputs) {
        if (!this.dom.consoleOutput) return;

        const outputs = consoleOutputs || [];
        if (this.dom.consoleCountBadge) {
            this.dom.consoleCountBadge.textContent = outputs.length === 1 ? 'שורה 1' : `${outputs.length} שורות`;
        }

        // אם יש פלט חדש והלשונית אינה פתוחה כרגע - הדלקת חיווי התראה עדין בלשונית
        if (outputs.length > 0 && this.dom.tabPaneConsole && !this.dom.tabPaneConsole.classList.contains('active')) {
            if (this.dom.tabBtnConsole) {
                this.dom.tabBtnConsole.classList.add('tab-has-new');
            }
        }

        if (outputs.length === 0) {
            this.dom.consoleOutput.innerHTML = '<div class="console-empty">הפלט של Console.WriteLine יופיע כאן...</div>';
            return;
        }

        let html = '';
        outputs.forEach((line, idx) => {
            const isLatest = idx === outputs.length - 1;
            const escaped = this.escapeHtml(String(line));
            html += `<div class="console-line ${isLatest ? 'new-line-highlight' : ''}"><span class="console-line-prompt">&gt;</span><span class="console-line-text">${escaped}</span></div>`;
        });

        this.dom.consoleOutput.innerHTML = html;
        this.dom.consoleOutput.scrollTop = this.dom.consoleOutput.scrollHeight;
    }

    stepNext() {
        if (this.currentFrameIdx < this.frames.length - 1) {
            this.currentFrameIdx++;
            this.renderCurrentFrame();
        }
    }

    stepPrev() {
        if (this.currentFrameIdx > 0) {
            this.currentFrameIdx--;
            this.renderCurrentFrame();
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.currentFrameIdx >= this.frames.length - 1) {
            this.currentFrameIdx = 0;
        }
        this.isPlaying = true;
        this.dom.btnPlay.innerHTML = '⏸ השהה';
        this.dom.btnPlay.classList.replace('btn-success', 'btn-secondary');

        this.playTimer = setInterval(() => {
            if (this.currentFrameIdx < this.frames.length - 1) {
                this.stepNext();
            } else {
                this.pause();
            }
        }, this.speedMs);
    }

    pause() {
        this.isPlaying = false;
        if (this.playTimer) {
            clearInterval(this.playTimer);
            this.playTimer = null;
        }
        this.dom.btnPlay.innerHTML = '▶ נגן';
        this.dom.btnPlay.classList.replace('btn-secondary', 'btn-success');
    }

    reset() {
        this.pause();
        this.currentFrameIdx = 0;
        this.renderCurrentFrame();
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// אתחול בעת טעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QueueVisualizerApp();
    window.app.init();
});
