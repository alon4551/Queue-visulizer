/**
 * Queue Visualizer & Debugger UI Controller
 * אלון שרייבמן - מגמת מדעי המחשב
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
        this.initialParams = { q: [14, 7, 25, 9, 31] };
        this.studioMode = 'all'; // 'all', 'queue', 'stack', 'node', 'binnode'

        // ניהול קבצי מחלקות בלשוניות (Class & File Tabs)
        this.editorFiles = {
            'Program.cs': {
                name: 'Program.cs',
                isMain: true,
                canDelete: false,
                code: `public class Program
{
    public static void Main(Queue<int> q)
    {
        
    }
}`
            }
        };
        this.activeFileName = 'Program.cs';

        this.dom = {};
    }

    init() {
        this.cacheDom();
        this.setupStudioMode();
        this.bindEvents();
        this.setupEditorTabs();
        this.renderEditorTabs();
        this.setupWindowResizers();
        this.setupQueueDragging();
        if (this.dom.initialQueueInput) {
            this.dom.initialQueueInput.value = this.initialQueue.join(', ');
        }
        this.dom.codeTextarea.value = this.editorFiles[this.activeFileName].code;
        this.updateLineNumbers();
        this.recompile();
    }

    cacheDom() {
        this.dom.studioModeBar = document.getElementById('studio-mode-bar');
        this.dom.studioModeButtons = document.querySelectorAll('.btn-studio-mode');

        this.dom.initialQueueInput = document.getElementById('initial-queue-input');
        this.dom.btnSetQueue = document.getElementById('btn-set-queue');
        this.dom.btnRandomQueue = document.getElementById('btn-random-queue');

        this.dom.editorTabsBar = document.getElementById('editor-tabs-bar');
        this.dom.editorTabsList = document.getElementById('editor-tabs-list');
        this.dom.btnAddClassTab = document.getElementById('btn-add-class-tab');
        this.dom.queueParamsContainer = document.getElementById('queue-params-container');
        this.dom.queueInitActionsBar = document.getElementById('queue-init-actions-bar');

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
        this.dom.btnMaximizeQueueStage = document.getElementById('btn-maximize-queue-stage');
        this.dom.queueStageResizer = document.getElementById('queue-stage-resizer');
        this.dom.layoutSplitter = document.getElementById('layout-splitter-horizontal');
        this.dom.queueDragHint = document.getElementById('queue-drag-hint');
        this.dom.mainContainer = document.getElementById('main-container') || document.querySelector('.main-container');
        this.dom.visualPanel = document.getElementById('visual-panel') || document.querySelector('.visual-panel');

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

    setupStudioMode() {
        this.studioMode = 'all';
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        if (modeParam && ['all', 'queue', 'stack', 'node', 'binnode'].includes(modeParam)) {
            this.studioMode = modeParam;
        }

        if (this.dom.studioModeButtons) {
            this.dom.studioModeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    if (mode) {
                        this.setStudioMode(mode, true);
                    }
                });
            });
        }

        this.applyStudioModeClass();
    }

    setStudioMode(mode, updateUrl = false) {
        this.studioMode = mode;
        if (this.dom.studioModeButtons) {
            this.dom.studioModeButtons.forEach(btn => {
                if (btn.dataset.mode === mode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        this.applyStudioModeClass();

        if (updateUrl && window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            if (mode === 'all') {
                url.searchParams.delete('mode');
            } else {
                url.searchParams.set('mode', mode);
            }
            window.history.replaceState({}, '', url.toString());
        }

        if (this.frames && this.frames.length > 0) {
            this.renderCurrentFrame({ followFile: false });
        }
    }

    applyStudioModeClass() {
        if (!this.dom.queuesStage) return;
        ['mode-all', 'mode-queue', 'mode-stack', 'mode-node', 'mode-binnode'].forEach(cls => {
            this.dom.queuesStage.classList.remove(cls);
        });
        this.dom.queuesStage.classList.add(`mode-${this.studioMode}`);
        this.dom.queuesStage.dataset.studioMode = this.studioMode;
    }

    bindEvents() {
        // עדכון תור התחלתי ידני
        this.dom.btnSetQueue.addEventListener('click', () => {
            this.updateQueueFromInput();
            if (this.switchQueueTab) this.switchQueueTab('queue-view');
        });

        if (this.dom.initialQueueInput) {
            this.dom.initialQueueInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.updateQueueFromInput();
                    if (this.switchQueueTab) this.switchQueueTab('queue-view');
                }
            });
        }

        // הגרלת ערכים לכל התורים המוגדרים
        this.dom.btnRandomQueue.addEventListener('click', () => {
            this.randomizeAllQueues();
            if (this.switchQueueTab) this.switchQueueTab('queue-view');
        });

        // עריכת קוד ידנית
        this.dom.codeTextarea.addEventListener('input', () => {
            if (this.editorFiles && this.editorFiles[this.activeFileName]) {
                this.editorFiles[this.activeFileName].code = this.dom.codeTextarea.value;
            }
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

            // פתיחה יזומה או שחזור של חלון ההשלמה האוטומטית באמצעות Ctrl+Space
            if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
                if (this.autocomplete) {
                    e.preventDefault();
                    this.autocomplete.triggerManual();
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
                    const code = `// מציאת ערך מקסימלי בתור של מספרים
public class Program
{
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
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialQueueType = 'int';
                    this.initialQueue = [14, 7, 25, 9, 31];
                    this.initialParams = { q: [14, 7, 25, 9, 31] };
                    this.renderEditorTabs();
                } else if (choice === 'chars') {
                    const code = `// ספירת מופעים של תו מסוים בתור של תווים
public class Program
{
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
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialQueueType = 'char';
                    this.initialQueue = ['a', 'b', 'a', 'c', 'a', 'd'];
                    this.initialParams = { q: ['a', 'b', 'a', 'c', 'a', 'd'] };
                    this.renderEditorTabs();
                } else if (choice === 'strings') {
                    const code = `// שרשור שמות מתור של מחרוזות
public class Program
{
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
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialQueueType = 'string';
                    this.initialQueue = ['Dana', 'Alon', 'Maya', 'Noam'];
                    this.initialParams = { q: ['Dana', 'Alon', 'Maya', 'Noam'] };
                    this.renderEditorTabs();
                } else if (choice === 'class-point') {
                    const pointCode = `// מחלקה מותאמת אישית Point (בלשונית ייעודית נפרדת)
public class Point
{
    private int x;
    private int y;

    public Point(int x, int y)
    {
        this.x = x;
        this.y = y;
    }

    // Getter ו-Setter עבור שדה פרטי x
    public int GetX()
    {
        return this.x;
    }

    public void SetX(int value)
    {
        this.x = value;
    }

    // מאפיין (Property) ב-C# עם get ו-set עבור y
    public int Y
    {
        get { return this.y; }
        set { this.y = value; }
    }

    public override string ToString()
    {
        return "(" + this.x + ", " + this.y + ")";
    }
}`;

                    const programCode = `// פעולת כניסה ראשית Program המשתמשת במחלקה Point מקובץ Point.cs
public class Program
{
    public static void Main(Queue<Point> q)
    {
        Queue<Point> temp = new Queue<Point>();

        while (!q.IsEmpty())
        {
            Point p = q.Remove();
            Console.WriteLine("נקודה שנשלפה: " + p.ToString() + " [GetX()=" + p.GetX() + ", Y=" + p.Y + "]");
            
            // עדכון ערכים דרך ה-Setter והמאפיין
            p.SetX(p.GetX() + 5);
            p.Y = p.Y + 10;
            Console.WriteLine("--> לאחר שינוי: " + p.ToString());

            temp.Insert(p);
        }

        while (!temp.IsEmpty())
        {
            q.Insert(temp.Remove());
        }
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code: programCode },
                        'Point.cs': { name: 'Point.cs', className: 'Point', isMain: false, canDelete: true, code: pointCode }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = programCode;
                    this.initialQueueType = 'Point';
                    this.initialQueue = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
                    this.initialParams = { q: this.initialQueue };
                    this.renderEditorTabs();
                } else if (choice === 'queue-of-queues') {
                    const code = `// עבודה עם תור של תורים Queue<Queue<int>>
public class Program
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
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialQueueType = 'Queue<int>';
                    this.initialQueue = [[10, 20], [30, 40, 50], [60]];
                    this.initialParams = { superQ: [[10, 20], [30, 40, 50], [60]] };
                    this.renderEditorTabs();
                } else if (choice === 'multi-params') {
                    const code = `// דוגמה עם שני תורים ומשתנים מרובים המועברים לפעולה Main
public class Program
{
    public static void Main(Queue<int> q, Queue<int> r, string tag)
    {
        Console.WriteLine("התחלת עיבוד עבור תגית: " + tag);

        // העברת איברים מ-q ל-r עם הכפלה
        while (!q.IsEmpty())
        {
            int item = q.Remove();
            Console.WriteLine("מעביר מ-q: " + item + " -> מכניס ל-r: " + (item * 2));
            r.Insert(item * 2);
        }

        Console.WriteLine("סיום העברה! תור r מכיל כעת את כל הערכים המוכפלים.");
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialQueueType = 'int';
                    this.initialQueue = [14, 7, 25, 9, 31];
                    this.initialParams = {
                        q: [14, 7, 25, 9, 31],
                        r: [100, 200],
                        tag: "מיזוג-נתונים"
                    };
                    this.renderEditorTabs();
                } else if (choice === 'stack-basic') {
                    const code = `// פעולות בסיסיות במחסנית Stack<int> (Push, Pop, Top, IsEmpty)
public class Program
{
    public static void Main(Stack<int> s)
    {
        Console.WriteLine("הצצה לראש המחסנית: " + s.Top());
        Stack<int> temp = new Stack<int>();

        // שליפת כל האיברים מהמחסנית והדפסתם
        while (!s.IsEmpty())
        {
            int val = s.Pop();
            Console.WriteLine("נשלף מהמחסנית: " + val);
            temp.Push(val);
        }

        // שחזור המחסנית המקורית (שמירה על כלל הברזל בבגרות)
        while (!temp.IsEmpty())
        {
            s.Push(temp.Pop());
        }

        Console.WriteLine("המחסנית שוחזרה בהצלחה!");
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialParams = { s: [10, 20, 30, 40, 50] };
                    this.setStudioMode('stack', true);
                    this.renderEditorTabs();
                } else if (choice === 'stack-reverse-queue') {
                    const code = `// היפוך סדר איברי תור בעזרת מחסנית עזר (שאלה קלאסית בבגרות)
public class Program
{
    public static void ReverseQueue(Queue<int> q)
    {
        Stack<int> st = new Stack<int>();

        // שלב א': ריקון התור לתוך המחסנית (LIFO יהפוך את סדר האיברים)
        while (!q.IsEmpty())
        {
            int item = q.Remove();
            Console.WriteLine("מעביר מתור למחסנית: " + item);
            st.Push(item);
        }

        // שלב ב': ריקון המחסנית בחזרה לתור
        while (!st.IsEmpty())
        {
            int item = st.Pop();
            Console.WriteLine("מחזיר ממחסנית לתור: " + item);
            q.Insert(item);
        }

        Console.WriteLine("סיום! סדר איברי התור התהפך בהצלחה.");
    }

    public static void Main(Queue<int> q)
    {
        ReverseQueue(q);
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialParams = { q: [10, 20, 30, 40, 50] };
                    this.initialQueue = [10, 20, 30, 40, 50];
                    this.initialQueueType = 'int';
                    this.setStudioMode('all', true);
                    this.renderEditorTabs();
                } else if (choice === 'stack-brackets') {
                    const code = `// בדיקת איזון ותקינות סוגריים באמצעות מחסנית תווים
public class Program
{
    public static bool IsBalanced(string expr)
    {
        Stack<char> st = new Stack<char>();

        for (int i = 0; i < expr.Length; i++)
        {
            char c = expr[i];
            if (c == '(' || c == '[')
            {
                st.Push(c);
                Console.WriteLine("הכנסת סוגר פותח למחסנית: " + c);
            }
            else if (c == ')' || c == ']')
            {
                if (st.IsEmpty())
                {
                    Console.WriteLine("שגיאה: נמצא סוגר סוגר ללא פותח!");
                    return false;
                }
                char top = st.Pop();
                Console.WriteLine("בדיקת התאמה: נשלף " + top + " מול " + c);
                if (c == ')' && top != '(') return false;
                if (c == ']' && top != '[') return false;
            }
        }

        bool balanced = st.IsEmpty();
        Console.WriteLine("האם כל הסוגריים נסגרו כראוי? " + balanced);
        return balanced;
    }

    public static void Main(string expr)
    {
        bool result = IsBalanced(expr);
        Console.WriteLine("תוצאה סופית: " + (result ? "מאוזן ומסודר!" : "לא מאוזן!"));
    }
}`;
                    this.editorFiles = {
                        'Program.cs': { name: 'Program.cs', isMain: true, canDelete: false, code }
                    };
                    this.activeFileName = 'Program.cs';
                    this.dom.codeTextarea.value = code;
                    this.initialParams = { expr: "([()]())" };
                    this.setStudioMode('stack', true);
                    this.renderEditorTabs();
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

    setupEditorTabs() {
        if (this.dom.btnAddClassTab) {
            this.dom.btnAddClassTab.addEventListener('click', () => {
                this.showNewClassInlineForm();
            });
        }
    }

    renderEditorTabs() {
        if (!this.dom.editorTabsList) return;
        this.dom.editorTabsList.innerHTML = '';

        const fileNames = Object.keys(this.editorFiles);
        fileNames.forEach(file => {
            const fileData = this.editorFiles[file];
            const tabItem = document.createElement('div');
            tabItem.className = `editor-tab-item ${file === this.activeFileName ? 'active' : ''}`;
            tabItem.dataset.fileName = file;

            const icon = fileData.isMain ? '⚡' : '📄';
            let closeBtnHtml = '';
            if (fileData.canDelete && !fileData.isMain) {
                closeBtnHtml = `<button type="button" class="editor-tab-close" data-file-name="${file}" title="מחק קובץ מחלקה זה">✕</button>`;
            }

            tabItem.innerHTML = `
                <span class="editor-tab-icon">${icon}</span>
                <span class="editor-tab-name">${file}</span>
                ${closeBtnHtml}
            `;

            tabItem.addEventListener('click', (e) => {
                if (e.target.closest('.editor-tab-close')) return;
                this.switchEditorTab(file);
            });

            if (fileData.canDelete) {
                const closeBtn = tabItem.querySelector('.editor-tab-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteClassFile(file);
                    });
                }
            }

            this.dom.editorTabsList.appendChild(tabItem);
        });
    }

    showNewClassInlineForm() {
        const existing = document.getElementById('new-tab-inline-form');
        if (existing) {
            const inp = existing.querySelector('input');
            if (inp) inp.focus();
            return;
        }

        const form = document.createElement('div');
        form.id = 'new-tab-inline-form';
        form.className = 'new-tab-inline-form';
        form.innerHTML = `
            <input type="text" placeholder="שם מחלקה (באנגלית)" autofocus />
            <button type="button" class="btn-tab-confirm" title="צור מחלקה">✓</button>
            <button type="button" class="btn-tab-cancel" title="ביטול">✕</button>
        `;

        this.dom.editorTabsList.appendChild(form);
        const input = form.querySelector('input');
        const confirmBtn = form.querySelector('.btn-tab-confirm');
        const cancelBtn = form.querySelector('.btn-tab-cancel');

        const handleCreate = () => {
            let val = input.value.trim();
            if (!val) {
                form.remove();
                return;
            }
            if (val.endsWith('.cs')) val = val.substring(0, val.length - 3).trim();
            if (!/^[a-zA-Z_]\w*$/.test(val)) {
                this.showInputError('שם מחלקה חייב להתחיל באות או קו תחתון באנגלית ולהכיל אותיות ומספרים בלבד (למשל Student, Car, Point).');
                input.focus();
                return;
            }
            form.remove();
            this.addNewClassFile(val);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleCreate();
            else if (e.key === 'Escape') form.remove();
        });
        confirmBtn.addEventListener('click', handleCreate);
        cancelBtn.addEventListener('click', () => form.remove());
        input.focus();
    }

    addNewClassFile(className, customCode = null) {
        const fileName = `${className}.cs`;
        if (this.editorFiles[fileName]) {
            this.switchEditorTab(fileName);
            return;
        }

        const defaultCode = customCode || `public class ${className}
{
    // הגדרת תכונות/שדות (Fields)
    private int id;

    // פעולה בונה (Constructor)
    public ${className}(int id)
    {
        this.id = id;
    }

    // Getters & Setters
    public int GetId()
    {
        return this.id;
    }

    public void SetId(int id)
    {
        this.id = id;
    }

    public override string ToString()
    {
        return "${className}(" + this.id + ")";
    }
}
`;

        if (this.editorFiles[this.activeFileName]) {
            this.editorFiles[this.activeFileName].code = this.dom.codeTextarea.value;
        }

        this.editorFiles[fileName] = {
            name: fileName,
            className: className,
            isMain: false,
            canDelete: true,
            code: defaultCode
        };

        this.activeFileName = fileName;
        this.dom.codeTextarea.value = defaultCode;
        this.updateLineNumbers();
        this.renderEditorTabs();
        this.recompile();
    }

    deleteClassFile(fileName) {
        if (fileName === 'Program.cs') return;
        delete this.editorFiles[fileName];

        if (this.activeFileName === fileName) {
            this.activeFileName = 'Program.cs';
            this.dom.codeTextarea.value = this.editorFiles['Program.cs'].code;
            this.updateLineNumbers();
        }

        this.renderEditorTabs();
        this.recompile();
    }

    switchEditorTab(fileName) {
        if (!this.editorFiles[fileName]) return;
        if (this.activeFileName === fileName) return;

        // שמירת תוכן העורך לקובץ הקודם
        if (this.editorFiles[this.activeFileName]) {
            this.editorFiles[this.activeFileName].code = this.dom.codeTextarea.value;
        }

        this.activeFileName = fileName;
        this.dom.codeTextarea.value = this.editorFiles[fileName].code;
        this.updateLineNumbers();
        this.renderEditorTabs();

        // הדגשת שורה עדכנית אם הצעד הנוכחי שייך לקובץ זה
        if (this.frames && this.frames[this.currentFrameIdx]) {
            const f = this.frames[this.currentFrameIdx];
            if ((f.file || 'Program.cs') === fileName) {
                this.renderEditorHighlight(f.line, Boolean(f.error));
            } else {
                this.renderEditorHighlight(0, false);
            }
        }
    }

    isCustomClassType(type) {
        if (!type) return false;
        if (type === 'Point') return true;
        if (this.interpreter && this.interpreter.classes && this.interpreter.classes.has(type)) return true;
        const primitives = ['int', 'char', 'string', 'bool', 'double', 'float', 'long', 'void'];
        if (!primitives.includes(type) && !type.startsWith('Queue')) return true;
        return false;
    }

    getClassDecl(type) {
        if (this.interpreter && this.interpreter.classes && this.interpreter.classes.has(type)) {
            return this.interpreter.classes.get(type);
        }
        return null;
    }

    splitCommaSeparated(str) {
        const parts = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (!inQuotes && (ch === '"' || ch === "'")) {
                inQuotes = true;
                quoteChar = ch;
                current += ch;
            } else if (inQuotes && ch === quoteChar) {
                inQuotes = false;
                quoteChar = '';
                current += ch;
            } else if (!inQuotes && ch === ',') {
                parts.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) {
            parts.push(current.trim());
        }
        return parts;
    }

    parseFieldValue(rawVal, type) {
        let clean = (rawVal || '').trim();
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
            clean = clean.slice(1, -1);
        }
        if (type === 'int' || type === 'double' || type === 'float' || type === 'long') {
            const num = Number(clean);
            return isNaN(num) ? 0 : num;
        }
        if (type === 'bool') {
            return clean.toLowerCase() === 'true';
        }
        if (type === 'char') {
            return clean.length > 0 ? clean[0] : ' ';
        }
        return clean;
    }

    parsePrimitiveValue(rawVal) {
        let clean = (rawVal || '').trim();
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
            return clean.slice(1, -1);
        }
        if (clean.toLowerCase() === 'true') return true;
        if (clean.toLowerCase() === 'false') return false;
        const num = Number(clean);
        if (!isNaN(num) && clean !== '') return num;
        return clean;
    }

    parseQueueInput(raw, targetType = 'int') {
        raw = (raw || '').trim();
        if (!raw) return [];

        if (this.isCustomClassType(targetType)) {
            const items = [];
            const classDecl = this.getClassDecl(targetType);
            let declaredFields = [];
            if (classDecl && classDecl.fields && classDecl.fields.length > 0) {
                declaredFields = classDecl.fields;
            } else if (targetType === 'Point') {
                declaredFields = [{ name: 'x', type: 'int' }, { name: 'y', type: 'int' }];
            }

            // 1. זיהוי סוגריים עגולים: (10, 20) או ("Dana", 95)
            const tupleRegex = /\(([^)]+)\)/g;
            let tm;
            while ((tm = tupleRegex.exec(raw)) !== null) {
                const parts = this.splitCommaSeparated(tm[1]);
                const obj = {};
                if (declaredFields.length > 0) {
                    declaredFields.forEach((f, idx) => {
                        if (idx < parts.length) {
                            obj[f.name] = this.parseFieldValue(parts[idx], f.type);
                        } else {
                            obj[f.name] = f.type === 'string' ? '' : (f.type === 'bool' ? false : 0);
                        }
                    });
                } else if (targetType === 'Point' && parts.length >= 2) {
                    obj.x = Number(parts[0]) || 0;
                    obj.y = Number(parts[1]) || 0;
                } else {
                    parts.forEach((p, idx) => {
                        obj[`field_${idx + 1}`] = this.parsePrimitiveValue(p);
                    });
                }
                items.push(obj);
            }

            // 2. זיהוי סוגריים מסולסלים: {x: 10, y: 20} או {name: "Dana", grade: 95}
            if (items.length === 0) {
                const objRegex = /\{([^}]+)\}/g;
                let om;
                while ((om = objRegex.exec(raw)) !== null) {
                    const content = om[1].trim();
                    const obj = {};
                    if (content.includes(':')) {
                        const pairs = this.splitCommaSeparated(content);
                        pairs.forEach(p => {
                            const colonIdx = p.indexOf(':');
                            if (colonIdx !== -1) {
                                const k = p.substring(0, colonIdx).trim().replace(/^["']|["']$/g, '');
                                const vStr = p.substring(colonIdx + 1).trim();
                                if (k) {
                                    obj[k] = this.parsePrimitiveValue(vStr);
                                }
                            }
                        });
                    } else {
                        const parts = this.splitCommaSeparated(content);
                        if (declaredFields.length > 0) {
                            declaredFields.forEach((f, idx) => {
                                if (idx < parts.length) {
                                    obj[f.name] = this.parseFieldValue(parts[idx], f.type);
                                }
                            });
                        } else if (targetType === 'Point' && parts.length >= 2) {
                            obj.x = Number(parts[0]) || 0;
                            obj.y = Number(parts[1]) || 0;
                        } else {
                            parts.forEach((p, idx) => {
                                obj[`field_${idx + 1}`] = this.parsePrimitiveValue(p);
                            });
                        }
                    }
                    if (Object.keys(obj).length > 0) {
                        items.push(obj);
                    }
                }
            }

            if (items.length === 0) {
                let sampleStr = '';
                if (declaredFields.length > 0) {
                    const ex = declaredFields.map(f => f.type === 'string' ? '"ערך"' : (f.type === 'bool' ? 'true' : '10')).join(', ');
                    sampleStr = ` (${ex})`;
                } else {
                    sampleStr = ' (ערך1, ערך2)';
                }
                throw new Error(`עבור מחלקה מותאמת אישית Queue<${targetType}> יש להזין איברים בסוגריים עגולים, לדוגמה:${sampleStr} או בסוגריים מסולסלים.`);
            }
            return items;
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
                throw new Error("עבור תור של תורים Queue<Queue<...>> יש להזין תורים פנימיים בסוגריים מרובעים, לדוגמה: [10, 20], [30, 40], [50, 60]");
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
        if (this.isCustomClassType(type)) {
            const classDecl = this.getClassDecl(type);
            let fields = [];
            if (classDecl && classDecl.fields && classDecl.fields.length > 0) {
                fields = classDecl.fields;
            } else if (type === 'Point') {
                fields = [{ name: 'x', type: 'int' }, { name: 'y', type: 'int' }];
            } else {
                fields = [{ name: 'val1', type: 'int' }, { name: 'val2', type: 'int' }];
            }

            const names = ['Dana', 'Noam', 'Tamar', 'Alon', 'Maya', 'Eitan', 'Yoni', 'Shira', 'Lior', 'Adi'];
            const items = [];
            for (let i = 0; i < 3; i++) {
                const obj = {};
                fields.forEach(f => {
                    const fNameLower = (f.name || '').toLowerCase();
                    if (f.type === 'string') {
                        obj[f.name] = names[(i + Math.floor(Math.random() * names.length)) % names.length];
                    } else if (f.type === 'char') {
                        const letters = 'ABCDEFGH';
                        obj[f.name] = letters[Math.floor(Math.random() * letters.length)];
                    } else if (f.type === 'bool') {
                        obj[f.name] = (i % 2 === 0);
                    } else {
                        // int / double
                        if (fNameLower.includes('grade') || fNameLower.includes('score')) {
                            obj[f.name] = Math.floor(Math.random() * 16) + 85; // 85-100
                        } else if (fNameLower.includes('age')) {
                            obj[f.name] = Math.floor(Math.random() * 5) + 14; // 14-18
                        } else if (type === 'Point' || fNameLower === 'x' || fNameLower === 'y') {
                            obj[f.name] = Math.floor(Math.random() * 20) + 1;
                        } else {
                            obj[f.name] = Math.floor(Math.random() * 30) + 10;
                        }
                    }
                });
                items.push(obj);
            }
            return items;
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
        if (this.isCustomClassType(type) || (items[0] && typeof items[0] === 'object' && !Array.isArray(items[0]) && !(items[0] instanceof QueueInstance))) {
            return items.map(p => {
                if (p && p.x !== undefined && p.y !== undefined && Object.keys(p).length === 2) {
                    return `(${p.x}, ${p.y})`;
                }
                const rawFields = (p && typeof p === 'object' && p.fields) ? p.fields : p;
                const vals = Object.values(rawFields).map(val => {
                    if (typeof val === 'string') return `"${val}"`;
                    if (typeof val === 'object' && val !== null) {
                        return JSON.stringify(val);
                    }
                    return String(val);
                });
                return `(${vals.join(', ')})`;
            }).join(', ');
        }
        if (type.startsWith('Queue')) {
            const subTypeMatch = type.match(/^Queue<(.+)>$/);
            const subType = subTypeMatch ? subTypeMatch[1].trim() : 'int';
            return items.map(subArr => `[${this.formatQueueInputValue(Array.isArray(subArr) ? subArr : (subArr.items || []), subType)}]`).join(', ');
        }
        if (type === 'char') {
            return items.map(c => `'${c}'`).join(', ');
        }
        if (type === 'string') {
            return items.map(s => `"${s}"`).join(', ');
        }
        return items.join(', ');
    }

    generateRandomStack(type = 'int') {
        return this.generateRandomQueue(type);
    }

    applyQueueFormatSample(sampleType) {
        if (!this.dom.initialQueueInput) return;

        let sampleVal = '';
        let targetCodePreset = null;

        if (sampleType === 'Stack') {
            sampleVal = '10, 20, 30, 40, 50';
            targetCodePreset = 'stack-basic';
        } else if (sampleType === 'Point' || this.isCustomClassType(sampleType)) {
            if (this.isCustomClassType(this.initialQueueType) && this.initialQueueType !== 'Point') {
                const sampleItems = this.generateRandomQueue(this.initialQueueType);
                sampleVal = this.formatQueueInputValue(sampleItems, this.initialQueueType);
            } else {
                sampleVal = '(10, 20), (30, 40), (50, 60)';
                if (this.initialQueueType !== 'Point') {
                    targetCodePreset = 'class-point';
                }
            }
        } else if (sampleType.startsWith('Queue')) {
            sampleVal = '[10, 20], [30, 40], [50, 60]';
            if (!this.initialQueueType.startsWith('Queue')) {
                targetCodePreset = 'queue-of-queues';
            }
        } else if (sampleType === 'char') {
            sampleVal = "'a', 'b', 'c', 'd'";
            if (this.initialQueueType !== 'char') {
                targetCodePreset = 'chars';
            }
        } else if (sampleType === 'string') {
            sampleVal = '"apple", "banana", "cherry", "date"';
            if (this.initialQueueType !== 'string') {
                targetCodePreset = 'strings';
            }
        } else {
            // int
            sampleVal = '14, 7, 25, 9, 31';
            if (this.initialQueueType !== 'int') {
                targetCodePreset = 'basic';
            }
        }

        // אם המשתמש בחר טיפוס שונה מהקוד הנוכחי, נטען את דוגמת הקוד התואמת
        const selectEl = this.dom.exampleCodeSelect || this.dom.exampleSelect;
        if (targetCodePreset && selectEl) {
            selectEl.value = targetCodePreset;
            selectEl.dispatchEvent(new Event('change'));
        }

        this.dom.initialQueueInput.value = sampleVal;
        this.updateQueueFromInput();
    }

    randomizeAllQueues() {
        if (!this.dom.queueParamsContainer) return;
        const queueInputs = this.dom.queueParamsContainer.querySelectorAll('.param-input[data-is-queue="true"]');
        const stackInputs = this.dom.queueParamsContainer.querySelectorAll('.param-input[data-is-stack="true"]');

        if (queueInputs.length === 0 && stackInputs.length === 0) {
            const randItems = this.generateRandomQueue(this.initialQueueType);
            this.initialQueue = randItems;
            this.initialParams['q'] = randItems;
            if (this.dom.initialQueueInput) {
                this.dom.initialQueueInput.value = this.formatQueueInputValue(randItems, this.initialQueueType);
            }
            this.recompile();
            return;
        }

        queueInputs.forEach(input => {
            const name = input.dataset.paramName;
            const pType = input.dataset.paramType || 'Queue<int>';
            const match = pType.match(/^Queue<(.+)>$/);
            const qType = match ? match[1].trim() : (this.initialQueueType || 'int');

            const randItems = this.generateRandomQueue(qType);
            this.initialParams[name] = randItems;
            if (input.id === 'initial-queue-input' || name === 'q') {
                this.initialQueue = randItems;
                this.initialQueueType = qType;
            }
            input.value = this.formatQueueInputValue(randItems, qType);
        });

        stackInputs.forEach(input => {
            const name = input.dataset.paramName;
            const pType = input.dataset.paramType || 'Stack<int>';
            const match = pType.match(/^Stack<(.+)>$/);
            const sType = match ? match[1].trim() : 'int';

            const randItems = this.generateRandomStack(sType);
            this.initialParams[name] = randItems;
            input.value = this.formatQueueInputValue(randItems, sType);
        });

        this.recompile();
    }

    updateQueueFromInput() {
        if (!this.dom.queueParamsContainer) return;
        const inputs = this.dom.queueParamsContainer.querySelectorAll('.param-input');
        if (inputs.length === 0) {
            if (this.dom.initialQueueInput) {
                try {
                    const parsed = this.parseQueueInput(this.dom.initialQueueInput.value, this.initialQueueType);
                    if (parsed.length > 0) {
                        this.initialQueue = parsed;
                        this.initialParams['q'] = parsed;
                        this.recompile();
                    } else {
                        this.showInputError('אנא הזן לפחות איבר אחד לתור ההתחלתי.');
                    }
                } catch (err) {
                    this.showInputError(err.message);
                }
            }
            return;
        }

        try {
            inputs.forEach(input => {
                const name = input.dataset.paramName;
                const isQueue = input.dataset.isQueue === 'true';
                const isStack = input.dataset.isStack === 'true';
                const pType = input.dataset.paramType || '';

                if (isQueue) {
                    const match = pType.match(/^Queue<(.+)>$/);
                    const qType = match ? match[1].trim() : (this.initialQueueType || 'int');
                    const parsed = this.parseQueueInput(input.value, qType);
                    if (parsed.length === 0) {
                        throw new Error(`אנא הזן לפחות איבר אחד לתור ${name}.`);
                    }
                    this.initialParams[name] = parsed;
                    if (input.id === 'initial-queue-input' || name === 'q') {
                        this.initialQueue = parsed;
                        this.initialQueueType = qType;
                    }
                } else if (isStack) {
                    const match = pType.match(/^Stack<(.+)>$/);
                    const sType = match ? match[1].trim() : 'int';
                    const parsed = this.parseQueueInput(input.value, sType);
                    if (parsed.length === 0) {
                        throw new Error(`אנא הזן לפחות איבר אחד למחסנית ${name}.`);
                    }
                    this.initialParams[name] = parsed;
                } else {
                    let val = input.value.trim();
                    if (pType === 'int') {
                        val = parseInt(val, 10);
                        if (isNaN(val)) val = 0;
                    } else if (pType === 'double' || pType === 'float') {
                        val = parseFloat(val);
                        if (isNaN(val)) val = 0.0;
                    } else if (pType === 'bool') {
                        val = (val.toLowerCase() === 'true');
                    } else if (pType === 'char') {
                        val = val.replace(/^'|'$/g, '');
                        val = val.length > 0 ? val[0] : ' ';
                    } else if (pType === 'string') {
                        val = val.replace(/^"|"$/g, '');
                    }
                    this.initialParams[name] = val;
                }
            });

            this.recompile();
        } catch (err) {
            this.showInputError(err.message);
        }
    }

    showInputError(msg) {
        if (this.dom.queueInitHint) {
            this.dom.queueInitHint.innerHTML = `<span style="color:#ef4444; font-weight:700;">⚠️ שגיאת תחביר בקלט:</span> ${msg}`;
        }
        if (typeof alert === 'function' && !window._suppressAlerts) {
            alert(msg);
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
        if (this.editorFiles && this.editorFiles[this.activeFileName]) {
            this.editorFiles[this.activeFileName].code = this.dom.codeTextarea.value;
        }

        const codeFiles = {};
        for (const [name, fObj] of Object.entries(this.editorFiles)) {
            codeFiles[name] = fObj.code;
        }

        let result = this.interpreter.run(codeFiles, this.initialParams);

        // עדכון כרטיס תור ופרמטרים
        const typeChanged = this.updateQueueInitUI(result);

        if (typeChanged) {
            result = this.interpreter.run(codeFiles, this.initialParams);
        }

        this.frames = result.frames;
        this.currentFrameIdx = 0;

        this.renderCurrentFrame({ followFile: false });
    }

    updateQueueInitUI(result) {
        if (!this.dom.queueInitCard) return false;

        // עדכון הדגשת כרטיסיות המדריך הפדגוגי לפי הטיפוס המזוהה
        const guideCards = document.querySelectorAll('.format-card');
        guideCards.forEach(card => {
            card.classList.remove('active-type');
            const activeIndicator = card.querySelector('.format-active-indicator');
            if (activeIndicator) activeIndicator.remove();
        });

        let typeChanged = false;

        if (result && result.params && result.params.length > 0) {
            this.dom.queueInitCard.classList.remove('inactive');

            // עדכון הכרטיסייה הפעילה במדריך הפורמט לפי התור או המחסנית הראשונים
            const primaryQueueParam = result.params.find(p => p.isQueue);
            const primaryStackParam = result.params.find(p => p.isStack);
            if (primaryQueueParam) {
                const qType = primaryQueueParam.itemType || 'int';

                let targetCardId = 'format-card-int';
                if (this.isCustomClassType(qType)) {
                    targetCardId = 'format-card-point';
                    const pointCardTag = document.querySelector('#format-card-point .format-tag');
                    if (pointCardTag) {
                        pointCardTag.textContent = `Queue<${qType}>`;
                    }
                } else if (qType.startsWith('Queue')) {
                    targetCardId = 'format-card-queue-of-queues';
                } else if (qType === 'char' || qType === 'string') {
                    targetCardId = 'format-card-char-string';
                }

                const activeCard = document.getElementById(targetCardId);
                if (activeCard) {
                    activeCard.classList.add('active-type');
                    const ind = document.createElement('span');
                    ind.className = 'format-active-indicator';
                    ind.innerHTML = '⚡ הטיפוס הנוכחי בקוד';
                    const header = activeCard.querySelector('.format-card-header');
                    if (header) {
                        header.appendChild(ind);
                    }
                }

                if (qType !== this.initialQueueType) {
                    this.initialQueueType = qType;
                    typeChanged = true;
                }
            } else if (primaryStackParam) {
                const activeCard = document.getElementById('format-card-stack');
                if (activeCard) {
                    activeCard.classList.add('active-type');
                    const ind = document.createElement('span');
                    ind.className = 'format-active-indicator';
                    ind.innerHTML = '⚡ הטיפוס הנוכחי בקוד';
                    const header = activeCard.querySelector('.format-card-header');
                    if (header) {
                        header.appendChild(ind);
                    }
                }
            }

            // עדכון כרטיסיות פרמטרים בחלון הקלט
            if (this.dom.queueParamsContainer) {
                this.dom.queueParamsContainer.innerHTML = '';

                let queueCount = 0;
                result.params.forEach((param, pIdx) => {
                    const card = document.createElement('div');
                    card.className = 'param-init-card';
                    card.dataset.paramName = param.name;

                    if (param.isQueue) {
                        queueCount++;
                        const qType = param.itemType || 'int';

                        if (!this.initialParams[param.name]) {
                            if (pIdx === 0 && this.initialQueue && this.initialQueue.length > 0) {
                                this.initialParams[param.name] = this.initialQueue;
                            } else {
                                this.initialParams[param.name] = this.generateRandomQueue(qType);
                                typeChanged = true;
                            }
                        }

                        if (pIdx === 0) {
                            this.initialQueue = this.initialParams[param.name];
                            this.initialQueueType = qType;
                        }

                        let typeHeb = 'מספרים שלמים int';
                        let placeholder = 'לדוגמה: 14, 7, 25, 9, 31';
                        if (qType === 'char') {
                            typeHeb = "תווים char (למשל: 'a', 'b', 'c')";
                            placeholder = "לדוגמה: 'a', 'b', 'c', 'd'";
                        } else if (qType === 'string') {
                            typeHeb = 'מחרוזות string (למשל: "Dana", "Alon")';
                            placeholder = 'לדוגמה: "Dana", "Alon", "Maya"';
                        } else if (qType === 'Point') {
                            typeHeb = 'נקודות Point (למשל: (10, 20), (30, 40))';
                            placeholder = 'לדוגמה: (10, 20), (30, 40), (50, 60)';
                        } else if (this.isCustomClassType(qType)) {
                            typeHeb = `אובייקטים מסוג ${qType}`;
                            placeholder = 'לדוגמה: (1, 10), (2, 20)';
                        } else if (qType.startsWith('Queue')) {
                            typeHeb = 'תור מקונן של תורים';
                            placeholder = 'לדוגמה: [10, 20], [30, 40]';
                        }

                        const isFirstQueue = (queueCount === 1);
                        const inputId = isFirstQueue ? 'id="initial-queue-input"' : '';
                        const rowId = isFirstQueue ? 'id="queue-init-row"' : '';
                        const formattedVal = this.formatQueueInputValue(this.initialParams[param.name], qType);

                        card.innerHTML = `
                            <div class="param-init-header">
                                <span class="param-init-title">📥 תור: <code>Queue&lt;${qType}&gt; ${param.name}</code></span>
                                <span class="param-badge badge-queue">תור ${qType}</span>
                            </div>
                            <div class="param-init-row" ${rowId}>
                                <input type="text" ${inputId} class="input-text param-input" data-param-name="${param.name}" data-param-type="${param.type}" data-is-queue="true" placeholder="${placeholder}" value="${formattedVal}" />
                                <button type="button" class="btn btn-secondary btn-random-single-queue" data-param-name="${param.name}" title="🎲 הגרל ערכים לתור ${param.name} בלבד">🎲</button>
                            </div>
                            <p class="param-init-hint">ערכי התור (${typeHeb}) מועברים כפרמטר <code>${param.name}</code> לפעולה Main.</p>
                        `;

                        const inputEl = card.querySelector('.param-input');
                        inputEl.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                this.updateQueueFromInput();
                                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                            }
                        });

                        const singleRandBtn = card.querySelector('.btn-random-single-queue');
                        if (singleRandBtn) {
                            singleRandBtn.addEventListener('click', () => {
                                const newItems = this.generateRandomQueue(qType);
                                this.initialParams[param.name] = newItems;
                                if (isFirstQueue) {
                                    this.initialQueue = newItems;
                                }
                                inputEl.value = this.formatQueueInputValue(newItems, qType);
                                this.recompile();
                                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                            });
                        }
                    } else if (param.isStack) {
                        const sType = param.itemType || 'int';

                        if (!this.initialParams[param.name]) {
                            this.initialParams[param.name] = this.generateRandomStack(sType);
                            typeChanged = true;
                        }

                        let typeHeb = 'מספרים שלמים int';
                        let placeholder = '10, 20, 30, 40, 50';
                        if (sType === 'char') {
                            typeHeb = "תווים char (למשל: 'a', 'b', 'c')";
                            placeholder = "'a', 'b', 'c', 'd'";
                        } else if (sType === 'string') {
                            typeHeb = 'מחרוזות string (למשל: "Dana", "Alon")';
                            placeholder = '"Dana", "Alon", "Maya"';
                        } else if (sType === 'Point') {
                            typeHeb = 'נקודות Point (למשל: (10, 20), (30, 40))';
                            placeholder = '(10, 20), (30, 40), (50, 60)';
                        } else if (this.isCustomClassType(sType)) {
                            typeHeb = `אובייקטים מסוג ${sType}`;
                            placeholder = '(1, 10), (2, 20)';
                        }

                        const formattedVal = this.formatQueueInputValue(this.initialParams[param.name], sType);

                        card.innerHTML = `
                            <div class="param-init-header">
                                <span class="param-init-title">🥞 מחסנית: <code>Stack&lt;${sType}&gt; ${param.name}</code></span>
                                <span class="param-badge badge-stack">מחסנית ${sType}</span>
                            </div>
                            <div class="param-init-row">
                                <input type="text" class="input-text param-input" data-param-name="${param.name}" data-param-type="${param.type}" data-is-stack="true" placeholder="${placeholder}" value="${formattedVal}" />
                                <button type="button" class="btn btn-secondary btn-random-single-stack" data-param-name="${param.name}" title="🎲 הגרל ערכים למחסנית ${param.name} בלבד">🎲</button>
                            </div>
                            <p class="param-init-hint">
                                סדר קלט: <strong>[תחתית המחסנית]</strong> ➔ <strong>[ראש המחסנית Top]</strong> (${typeHeb}). מועבר כפרמטר <code>${param.name}</code> לפעולה Main.
                            </p>
                        `;

                        const inputEl = card.querySelector('.param-input');
                        inputEl.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                this.updateQueueFromInput();
                                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                            }
                        });

                        const singleRandBtn = card.querySelector('.btn-random-single-stack');
                        if (singleRandBtn) {
                            singleRandBtn.addEventListener('click', () => {
                                const newItems = this.generateRandomStack(sType);
                                this.initialParams[param.name] = newItems;
                                inputEl.value = this.formatQueueInputValue(newItems, sType);
                                this.recompile();
                                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                            });
                        }
                    } else {
                        // Primitive variable
                        const pType = param.type || 'int';
                        if (this.initialParams[param.name] === undefined) {
                            if (pType === 'string') this.initialParams[param.name] = 'hello';
                            else if (pType === 'char') this.initialParams[param.name] = 'a';
                            else if (pType === 'bool') this.initialParams[param.name] = true;
                            else this.initialParams[param.name] = 10;
                        }

                        let badgeClass = 'badge-int';
                        let placeholder = '10';
                        if (pType === 'string') {
                            badgeClass = 'badge-string';
                            placeholder = 'טקסט מחרוזת';
                        } else if (pType === 'char') {
                            badgeClass = 'badge-char';
                            placeholder = "'a'";
                        } else if (pType === 'bool') {
                            badgeClass = 'badge-int';
                            placeholder = 'true / false';
                        }

                        const rawVal = this.initialParams[param.name] !== undefined ? this.initialParams[param.name] : placeholder;
                        card.innerHTML = `
                            <div class="param-init-header">
                                <span class="param-init-title">🏷️ משתנה: <code>${pType} ${param.name}</code></span>
                                <span class="param-badge ${badgeClass}">${pType}</span>
                            </div>
                            <div class="param-init-row">
                                <input type="text" class="input-text param-input" data-param-name="${param.name}" data-param-type="${pType}" data-is-queue="false" placeholder="${placeholder}" value="${rawVal}" />
                            </div>
                            <p class="param-init-hint">ערך התחלתי שיועבר כפרמטר <code>${param.name}</code> לפעולה Main.</p>
                        `;

                        const inputEl = card.querySelector('.param-input');
                        inputEl.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                this.updateQueueFromInput();
                                if (this.switchQueueTab) this.switchQueueTab('queue-view');
                            }
                        });
                    }

                    this.dom.queueParamsContainer.appendChild(card);
                });

                this.dom.initialQueueInput = document.getElementById('initial-queue-input');
                this.dom.queueInitRow = document.getElementById('queue-init-row');
            }

            if (this.dom.queueInitTitle) {
                this.dom.queueInitTitle.innerHTML = `משתני ופרמטרי פעולת Main (${result.params.length})`;
            }
            if (this.dom.queueInitBadge) {
                this.dom.queueInitBadge.textContent = `קלט פעיל ל-${result.params.map(p => p.name).join(', ')}`;
                this.dom.queueInitBadge.className = 'badge badge-active';
            }
            if (this.dom.queueInitHint) {
                this.dom.queueInitHint.innerHTML = `הערכים מועברים ישירות כארגומנטים לפעולת הכניסה <code>Main(${result.params.map(p => `${p.type} ${p.name}`).join(', ')})</code>.`;
            }

            if (this.dom.btnSetQueue) this.dom.btnSetQueue.disabled = false;
            if (this.dom.btnRandomQueue) this.dom.btnRandomQueue.disabled = false;
        } else {
            this.dom.queueInitCard.classList.add('inactive');
            if (this.dom.queueParamsContainer) {
                this.dom.queueParamsContainer.innerHTML = '<p class="queue-init-desc" style="margin: 0.5rem 0;">💡 פעולת Main אינה מקבלת פרמטרים. תורים חדשים ייווצרו ויוצגו בעת שימוש ב-<code>new Queue&lt;T&gt;()</code> בקוד.</p>';
            }
            if (this.dom.queueInitTitle) {
                this.dom.queueInitTitle.innerHTML = `משתנה תור התחלתי`;
            }
            if (this.dom.queueInitBadge) {
                this.dom.queueInitBadge.textContent = `לא נדרש (אין פרמטרים)`;
                this.dom.queueInitBadge.className = 'badge badge-inactive';
            }
            if (this.dom.queueInitHint) {
                this.dom.queueInitHint.innerHTML = `💡 פעולת הכניסה אינה מקבלת פרמטר תור. תורים חדשים ייווצרו ויוצגו בחלון ההמחשה בעת שימוש ב-<code>new Queue&lt;T&gt;()</code> בקוד.`;
            }
            if (this.dom.btnSetQueue) this.dom.btnSetQueue.disabled = true;
            if (this.dom.btnRandomQueue) this.dom.btnRandomQueue.disabled = true;
        }

        return typeChanged;
    }

    renderCurrentFrame(options = {}) {
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

        // מעבר אוטומטי ללשונית הקובץ המתאים לפי הצעד הנוכחי רק בעת ניגון/צעד מפורש
        const frameFile = frame.file || 'Program.cs';
        const shouldFollow = options.followFile === true || (options.followFile !== false && this.isPlaying);
        if (shouldFollow && frameFile !== this.activeFileName && this.editorFiles[frameFile]) {
            this.switchEditorTab(frameFile);
        }

        // 3. הדגשת שורה בעורך הקוד (רק אם השורה שייכת לקובץ הפעיל כרגע)
        if (frameFile === this.activeFileName) {
            this.renderEditorHighlight(frame.line, Boolean(frame.error));
        } else {
            this.renderEditorHighlight(null, false);
        }

        // 4. עדכון סרגל משוב פדגוגי בעברית
        this.renderStatusBanner(frame);

        // 5. רינדור מסלולי התורים והמחסניות (Stage)
        this.renderStage(frame);

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

    renderStage(frame) {
        if (!this.dom.queuesStage) return;
        this.dom.queuesStage.innerHTML = '';

        const queues = frame.queues || [];
        const stacks = frame.stacks || [];

        const hasVisibleQueues = queues.length > 0 && this.studioMode !== 'stack';
        const hasVisibleStacks = stacks.length > 0 && this.studioMode !== 'queue';

        if (!hasVisibleQueues && !hasVisibleStacks) {
            let emptyIcon = '📦';
            let emptyTitle = 'אין מבני נתונים פעילים כעת בחלון';
            let emptyDesc = 'תורים ומחסניות שייווצרו בעת הרצת הקוד (או מועברים כפרמטרים ל-Main) יוצגו כאן אוטומטית.';

            if (this.studioMode === 'stack') {
                emptyIcon = '🥞';
                emptyTitle = 'אין מחסניות פעילות כעת בחלון';
                emptyDesc = 'מחסניות חדשות יוצגו כאן בעת הרצת <code>new Stack&lt;T&gt;()</code> או כאשר פעולת <code>Main</code> מקבלת מחסנית כפרמטר.';
            } else if (this.studioMode === 'queue') {
                emptyIcon = '🔄';
                emptyTitle = 'אין תורים פעילים כעת בחלון';
                emptyDesc = 'תורים חדשים יוצגו כאן בעת הרצת <code>new Queue&lt;T&gt;()</code> או כאשר פעולת <code>Main</code> מקבלת תור כפרמטר.';
            }

            this.dom.queuesStage.innerHTML = `
                <div class="queue-empty-stage">
                    <span class="empty-stage-icon">${emptyIcon}</span>
                    <p class="empty-stage-title">${emptyTitle}</p>
                    <p class="empty-stage-desc">${emptyDesc}</p>
                </div>
            `;
            return;
        }

        // רינדור תורים
        if (queues.length > 0) {
            this.renderQueues(queues, frame);
        }

        // רינדור מחסניות
        if (stacks.length > 0) {
            this.renderStacks(stacks, frame);
        }
    }

    renderQueues(queues, frame) {
        if (!queues || queues.length === 0) return;

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

            trackCard.dataset.queueName = q.name;
            trackCard.draggable = true;

            trackCard.innerHTML = `
                <div class="queue-track-header">
                    <div class="queue-name-tag">
                        <span class="queue-drag-handle" title="לחץ וגרור כדי לשנות את סדר התורים">⠿</span>
                        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${queueBadgeColor}"></span>
                        <span>Queue&lt;${q.itemType || 'int'}&gt; <strong>${q.name}</strong></span>
                    </div>
                    <div class="queue-header-end">
                        <span class="queue-drag-indicator" title="ניתן לגרור את מסילת התור ימינה ושמאלה עם העכבר">🖐️ גרירה פעילה</span>
                        <div class="queue-length-badge">כמות איברים: <strong>${q.items.length}</strong></div>
                    </div>
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
                            .map(([k, v]) => {
                                const acc = (itemVal.fieldAccess && itemVal.fieldAccess[k]) ? itemVal.fieldAccess[k] : 'public';
                                const icon = acc === 'private' ? '<span title="private (פרטי)" class="field-access-icon">🔒</span> ' : (acc === 'protected' ? '<span title="protected (מוגן)" class="field-access-icon">🛡️</span> ' : '');
                                return `<div class="field-item">${icon}<span class="field-key">${k}:</span> <strong class="field-val">${v}</strong></div>`;
                            })
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

    renderStacks(stacks, frame) {
        if (!stacks || stacks.length === 0) return;

        stacks.forEach((s) => {
            const stackCard = document.createElement('div');
            stackCard.className = 'stack-track-card';
            if (s.lastOp && s.lastOp !== 'none') {
                stackCard.classList.add('active-target');
            }

            stackCard.dataset.stackName = s.name;
            stackCard.draggable = true;

            let gateAnimClass = '';
            if (s.lastOp === 'pop') gateAnimClass = 'anim-pop';
            else if (s.lastOp === 'push') gateAnimClass = 'anim-push';
            else if (s.lastOp === 'top') gateAnimClass = 'anim-top';

            stackCard.innerHTML = `
                <div class="stack-track-header">
                    <div class="stack-title-box">
                        <span class="queue-drag-handle" title="לחץ וגרור כדי לשנות את סדר המבנים">⠿</span>
                        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#9333ea;"></span>
                        <span class="stack-name-title">Stack&lt;${s.itemType || 'int'}&gt; <strong>${s.name}</strong></span>
                        <span class="stack-type-badge">מחסנית</span>
                    </div>
                    <div class="stack-count-badge">כמות איברים: <strong>${s.items.length}</strong></div>
                </div>

                <div class="stack-top-gate ${gateAnimClass}" title="ראש המחסנית (Top) - כניסה (Push) ויציאה (Pop) מלמעלה">
                    <span class="gate-icon">🔝</span>
                    <span class="gate-title">ראש המחסנית (Top)</span>
                </div>

                <div class="stack-canister" id="canister-${s.name}">
                </div>
            `;

            const canister = stackCard.querySelector(`#canister-${s.name}`);

            if (s.items.length === 0) {
                canister.innerHTML = '<div class="stack-canister-empty">[ מחסנית ריקה ]</div>';
            } else {
                s.items.forEach((itemVal, idx) => {
                    const isTop = (idx === s.items.length - 1);
                    const el = document.createElement('div');
                    el.className = 'stack-element';

                    if (isTop) {
                        el.classList.add('is-top');
                        if (s.lastOp === 'push') {
                            el.classList.add('op-push');
                        }
                    }

                    if (itemVal && typeof itemVal === 'object' && itemVal.isClass) {
                        el.classList.add('node-complex', 'node-custom-class');
                        const fieldsHtml = Object.entries(itemVal.fields || {})
                            .map(([k, v]) => `<div class="field-item"><span class="field-key">${k}:</span> <strong class="field-val">${v}</strong></div>`)
                            .join('');
                        let toStrHtml = '';
                        if (itemVal.toStringVal && !itemVal.toStringVal.startsWith(itemVal.className + ' {')) {
                            toStrHtml = `<div class="class-card-tostring">${this.escapeHtml(itemVal.toStringVal)}</div>`;
                        }
                        el.innerHTML = `
                            <div class="custom-class-card">
                                <div class="class-card-header">
                                    <span class="class-icon">📦</span>
                                    <span class="class-title">${this.escapeHtml(itemVal.className)}</span>
                                </div>
                                <div class="class-card-fields">${fieldsHtml}</div>
                                ${toStrHtml}
                            </div>
                        `;
                    } else {
                        let displayVal = itemVal;
                        let valClass = 'stack-val';
                        if (typeof itemVal === 'string') {
                            if (s.itemType === 'char') {
                                displayVal = `'${itemVal}'`;
                                valClass += ' val-char';
                            } else {
                                displayVal = `"${itemVal}"`;
                                valClass += ' val-string';
                            }
                        }
                        el.innerHTML = `<span class="${valClass}" title="${itemVal}">${this.escapeHtml(displayVal)}</span>`;
                    }

                    canister.appendChild(el);
                });
            }

            this.dom.queuesStage.appendChild(stackCard);
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

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
            this.renderCurrentFrame({ followFile: true });
        }
    }

    stepPrev() {
        if (this.currentFrameIdx > 0) {
            this.currentFrameIdx--;
            this.renderCurrentFrame({ followFile: true });
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

    setupWindowResizers() {
        const container = this.dom.mainContainer;
        const splitter = this.dom.layoutSplitter;
        const stageResizer = this.dom.queueStageResizer;
        const stageCard = this.dom.queueStageCard;
        const maxBtn = this.dom.btnMaximizeQueueStage;

        // 1. Horizontal Splitter (שינוי רוחב חלון התצוגה vs עורך הקוד)
        if (container && splitter) {
            const savedWidth = localStorage.getItem('queue_viz_split_width');
            if (savedWidth) {
                const w = parseFloat(savedWidth);
                if (!isNaN(w) && w >= 20 && w <= 80) {
                    container.style.gridTemplateColumns = `${w}% 10px ${100 - w}%`;
                }
            }

            let isDraggingHoriz = false;
            let startX = 0;
            let startVisualWidth = 0;
            let containerWidth = 0;

            const onPointerDownHoriz = (e) => {
                isDraggingHoriz = true;
                startX = e.clientX;
                const containerRect = container.getBoundingClientRect();
                containerWidth = containerRect.width;
                const visualPanel = document.getElementById('visual-panel') || document.querySelector('.visual-panel');
                startVisualWidth = visualPanel ? visualPanel.getBoundingClientRect().width : containerWidth * 0.58;

                splitter.classList.add('is-dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                try { splitter.setPointerCapture(e.pointerId); } catch (_) {}
                e.preventDefault();
            };

            const onPointerMoveHoriz = (e) => {
                if (!isDraggingHoriz) return;
                const isRtl = document.documentElement.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl';
                const deltaX = e.clientX - startX;
                // In RTL, dragging mouse left increases right column (visual-panel)
                const currentVisualWidth = isRtl ? (startVisualWidth - deltaX) : (startVisualWidth + deltaX);

                const minVisual = 280;
                const minEditor = 260;
                const maxVisual = containerWidth - minEditor - 20;
                const clamped = Math.max(minVisual, Math.min(maxVisual, currentVisualWidth));

                const visualPercent = (clamped / containerWidth) * 100;
                const editorPercent = 100 - visualPercent;

                container.style.gridTemplateColumns = `${visualPercent.toFixed(2)}% 10px ${editorPercent.toFixed(2)}%`;
                localStorage.setItem('queue_viz_split_width', visualPercent.toFixed(2));
            };

            const onPointerUpHoriz = (e) => {
                if (!isDraggingHoriz) return;
                isDraggingHoriz = false;
                splitter.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                try { splitter.releasePointerCapture(e.pointerId); } catch (_) {}
            };

            splitter.addEventListener('pointerdown', onPointerDownHoriz);
            splitter.addEventListener('pointermove', onPointerMoveHoriz);
            splitter.addEventListener('pointerup', onPointerUpHoriz);
            splitter.addEventListener('pointercancel', onPointerUpHoriz);
        }

        // 2. Vertical Resizer (שינוי גובה חלון תצוגת התור)
        if (stageResizer && stageCard) {
            const savedHeight = localStorage.getItem('queue_viz_stage_height');
            if (savedHeight) {
                const h = parseFloat(savedHeight);
                if (!isNaN(h) && h >= 160 && h <= 1200) {
                    stageCard.style.height = `${h}px`;
                    stageCard.style.setProperty('--stage-card-flex', `0 0 ${h}px`);
                }
            }

            let isDraggingVert = false;
            let startY = 0;
            let startHeight = 0;

            const onPointerDownVert = (e) => {
                isDraggingVert = true;
                startY = e.clientY;
                startHeight = stageCard.getBoundingClientRect().height;

                stageResizer.classList.add('is-dragging');
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
                try { stageResizer.setPointerCapture(e.pointerId); } catch (_) {}
                e.preventDefault();
            };

            const onPointerMoveVert = (e) => {
                if (!isDraggingVert) return;
                const deltaY = e.clientY - startY;
                const visualPanel = document.getElementById('visual-panel') || document.querySelector('.visual-panel');
                const panelHeight = visualPanel ? visualPanel.getBoundingClientRect().height : 800;

                const minHeight = 160;
                const maxHeight = Math.max(minHeight + 60, panelHeight - 110);
                const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));

                stageCard.style.height = `${newHeight}px`;
                stageCard.style.setProperty('--stage-card-flex', `0 0 ${newHeight}px`);
                localStorage.setItem('queue_viz_stage_height', newHeight);
            };

            const onPointerUpVert = (e) => {
                if (!isDraggingVert) return;
                isDraggingVert = false;
                stageResizer.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                try { stageResizer.releasePointerCapture(e.pointerId); } catch (_) {}
            };

            stageResizer.addEventListener('pointerdown', onPointerDownVert);
            stageResizer.addEventListener('pointermove', onPointerMoveVert);
            stageResizer.addEventListener('pointerup', onPointerUpVert);
            stageResizer.addEventListener('pointercancel', onPointerUpVert);
        }

        // 3. Maximize / Fullscreen Toggle (הגדלה / שחזור חלון תצוגת התור)
        if (maxBtn && stageCard) {
            maxBtn.addEventListener('click', () => {
                const isMax = stageCard.classList.toggle('is-maximized');
                maxBtn.innerHTML = isMax ? '❐' : '⛶';
                maxBtn.title = isMax ? 'שחזר גודל חלון תצוגה' : 'הגדל חלון תצוגה';
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && stageCard.classList.contains('is-maximized')) {
                    stageCard.classList.remove('is-maximized');
                    maxBtn.innerHTML = '⛶';
                    maxBtn.title = 'הגדל חלון תצוגה';
                }
            });
        }
    }

    setupQueueDragging() {
        const stage = this.dom.queuesStage;
        if (!stage) return;

        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;
        let activeTarget = null;
        let hasMoved = false;
        let velocityX = 0;
        let lastX = 0;
        let lastTime = 0;
        let animationFrame = null;

        // 1. Click & Drag Pan on the Track & Flow
        stage.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.queue-drag-handle')) {
                return;
            }

            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }

            const flow = e.target.closest('.queue-elements-flow') || e.target.closest('.queue-horizontal-track');
            activeTarget = flow || stage;

            isDown = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            lastX = e.clientX;
            lastTime = performance.now();
            velocityX = 0;
            scrollLeft = activeTarget.scrollLeft;
            scrollTop = activeTarget.scrollTop;

            activeTarget.classList.add('is-panning');
            document.body.classList.add('queue-dragging-active');
            try { activeTarget.setPointerCapture(e.pointerId); } catch (_) {}
        });

        stage.addEventListener('pointermove', (e) => {
            if (!isDown || !activeTarget) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasMoved = true;
            }

            const now = performance.now();
            const dt = Math.max(1, now - lastTime);
            velocityX = (e.clientX - lastX) / dt;
            lastX = e.clientX;
            lastTime = now;

            if (activeTarget !== stage) {
                activeTarget.scrollLeft = scrollLeft - dx;
            } else {
                activeTarget.scrollLeft = scrollLeft - dx;
                activeTarget.scrollTop = scrollTop - dy;
            }
        });

        const stopDrag = (e) => {
            if (!isDown) return;
            isDown = false;
            const target = activeTarget;

            if (target) {
                target.classList.remove('is-panning');
                try { target.releasePointerCapture(e.pointerId); } catch (_) {}
                activeTarget = null;
            }
            document.body.classList.remove('queue-dragging-active');

            // Momentum glide
            if (hasMoved && target && Math.abs(velocityX) > 0.2) {
                let currentVelocity = velocityX * 12;
                const glide = () => {
                    if (Math.abs(currentVelocity) < 0.5) return;
                    target.scrollLeft -= currentVelocity;
                    currentVelocity *= 0.92;
                    animationFrame = requestAnimationFrame(glide);
                };
                animationFrame = requestAnimationFrame(glide);
            }
        };

        stage.addEventListener('pointerup', stopDrag);
        stage.addEventListener('pointercancel', stopDrag);

        stage.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
                hasMoved = false;
            }
        }, true);

        // 2. Drag & Drop Reordering for Queue & Stack Cards
        let draggedCard = null;

        stage.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.queue-track-card, .stack-track-card');
            if (!card) return;
            draggedCard = card;
            card.classList.add('is-dragging-card');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.queueName || card.dataset.stackName || '');
        });

        stage.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const targetCard = e.target.closest('.queue-track-card, .stack-track-card');
            if (targetCard && targetCard !== draggedCard) {
                const rect = targetCard.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                stage.insertBefore(draggedCard, isAfter ? targetCard.nextSibling : targetCard);
            }
        });

        stage.addEventListener('dragend', () => {
            if (draggedCard) {
                draggedCard.classList.remove('is-dragging-card');
                draggedCard = null;
            }
        });
    }
}

// אתחול בעת טעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QueueVisualizerApp();
    window.app.init();
});
