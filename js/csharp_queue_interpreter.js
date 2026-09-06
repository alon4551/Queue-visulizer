/**
 * C# Queue Interpreter & Execution Tracer
 * בית ספר מקיף דוד טוביהו - מגמת מדעי המחשב
 * 
 * תומך בתת-קבוצת C# של בגרות י"ב מדעי המחשב:
 * - מבנה נתונים Queue<T> (Insert, Remove, Head, IsEmpty)
 * - הגדרת פונקציות (public static <type> Name(params))
 * - קריאות לפונקציות, קריאות מקוננות ומחסנית קריאות (Call Stack)
 * - לולאות while, תנאי if / else if / else
 * - משתנים מקומיים (int, double, bool, string, Queue<int>)
 * - מחולל TraceFrames מלא עבור הדיבאגר וההנפשה
 */

class CSharpQueueInterpreter {
    constructor() {
        this.maxSteps = 1500; // הגנה מפני לולאות אינסופיות
    }

    /**
     * הרצת קוד C# ויצירת מערך TraceFrames להנפשה
     * @param {string} sourceCode קוד מקור C# של התלמיד
     * @param {Array<number>} initialQueueValues מערך ערכים ראשוני לתור q
     * @returns {Object} { frames: TraceFrame[], error: string|null, originalPreserved: boolean|null }
     */
    run(sourceCode, initialQueueValues = [10, 20, 30, 40]) {
        let runtime = null;
        try {
            const preprocessed = this.preprocess(sourceCode);
            const ast = this.parse(preprocessed.tokens, preprocessed.lineMap);
            runtime = new RuntimeEnvironment(ast, initialQueueValues, this.maxSteps);
            const trace = runtime.execute();
            return trace;
        } catch (err) {
            const errorLine = err.line || 1;
            const existingFrames = (runtime && runtime.frames && runtime.frames.length > 0) ? runtime.frames : [];
            const lastFrame = existingFrames.length > 0 ? existingFrames[existingFrames.length - 1] : null;

            existingFrames.push({
                step: existingFrames.length,
                line: errorLine,
                description: `❌ שגיאת ריצה: ${err.message}`,
                callStack: lastFrame ? lastFrame.callStack : [{ funcName: 'שגיאה', line: errorLine, variables: {} }],
                queues: lastFrame ? lastFrame.queues : [{ name: 'q', items: [...initialQueueValues], op: 'none' }],
                variables: lastFrame ? lastFrame.variables : {},
                consoleOutputs: lastFrame && lastFrame.consoleOutputs ? [...lastFrame.consoleOutputs] : [],
                error: err.message,
                isCompleted: true,
                originalPreserved: false
            });

            return {
                frames: existingFrames,
                error: err.message,
                originalPreserved: false
            };
        }
    }

    /**
     * חלוקה לטוקנים תוך שמירה על מספרי שורות מקוריים
     */
    preprocess(code) {
        const rawLines = code.split(/\r?\n/);
        const lineMap = []; // index -> originalLineNumber
        const tokens = [];

        let inBlockComment = false;

        for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
            let line = rawLines[lineIdx];
            const originalLineNum = lineIdx + 1;

            // טיפול בהערות בלוק /* ... */
            if (inBlockComment) {
                const endCommentIdx = line.indexOf('*/');
                if (endCommentIdx !== -1) {
                    line = line.substring(endCommentIdx + 2);
                    inBlockComment = false;
                } else {
                    continue;
                }
            }

            const startCommentIdx = line.indexOf('/*');
            if (startCommentIdx !== -1) {
                const endCommentIdx = line.indexOf('*/', startCommentIdx + 2);
                if (endCommentIdx !== -1) {
                    line = line.substring(0, startCommentIdx) + ' ' + line.substring(endCommentIdx + 2);
                } else {
                    line = line.substring(0, startCommentIdx);
                    inBlockComment = true;
                }
            }

            // הסרת הערת שורה //
            const singleCommentIdx = line.indexOf('//');
            if (singleCommentIdx !== -1) {
                line = line.substring(0, singleCommentIdx);
            }

            // טוקניזציה לשורה הנוכחית
            const lineTokens = this.tokenizeLine(line, originalLineNum);
            tokens.push(...lineTokens);
        }

        return { tokens, lineMap };
    }

    tokenizeLine(line, lineNum) {
        const tokens = [];
        const regex = /\s*(==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>|[(){}\[\],;+\-*\/%<>=!.]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'|[a-zA-Z_]\w*(?:<[a-zA-Z0-9_, ]*>)?|-?\d+(?:\.\d+)?)\s*/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const val = match[1];
            tokens.push({
                value: val,
                line: lineNum
            });
        }
        return tokens;
    }

    /**
     * פרסור הרשימה של הטוקנים ל-AST
     */
    parse(tokens) {
        const p = new Parser(tokens);
        return p.parseProgram();
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek(offset = 0) {
        return this.tokens[this.pos + offset] || { value: '', line: -1 };
    }

    consume() {
        return this.tokens[this.pos++] || { value: '', line: -1 };
    }

    match(expected) {
        const tok = this.peek();
        if (tok.value === expected) {
            return this.consume();
        }
        return null;
    }

    expect(expected) {
        const tok = this.match(expected);
        if (!tok) {
            const current = this.peek();
            throw {
                line: current.line > 0 ? current.line : 1,
                message: `ציפייה ל-'${expected}', אך נמצא '${current.value || 'סוף הקוד'}'`
            };
        }
        return tok;
    }

    parseProgram() {
        const functions = [];
        const topLevelStatements = [];

        // נדלג על עטיפות class Program / namespace אם קיימות
        while (this.pos < this.tokens.length) {
            const t = this.peek();
            if (t.value === 'using' || t.value === 'namespace') {
                // דילוג עד ; או {
                while (this.pos < this.tokens.length && this.peek().value !== ';' && this.peek().value !== '{') {
                    this.consume();
                }
                if (this.peek().value === ';') this.consume();
                if (this.peek().value === '{') this.consume();
                continue;
            }

            if (t.value === 'class') {
                this.consume(); // 'class'
                if (this.pos < this.tokens.length) this.consume(); // class name
                if (this.match('{')) {
                    continue;
                }
            }

            if (t.value === '}') {
                this.consume();
                continue;
            }

            // בדיקה האם זו פונקציה
            if (this.isFunctionStart()) {
                functions.push(this.parseFunction());
            } else {
                topLevelStatements.push(this.parseStatement());
            }
        }

        return {
            type: 'Program',
            functions,
            topLevelStatements
        };
    }

    isFunctionStart() {
        let i = 0;
        let tok = this.peek(i);
        while (['public', 'private', 'protected', 'static', 'void', 'int', 'char', 'bool', 'double', 'string', 'var'].includes(tok.value) ||
               tok.value.startsWith('Queue<') || tok.value.startsWith('Queue')) {
            i++;
            tok = this.peek(i);
        }
        // tok צריך להיות שם הפונקציה
        if (/^[a-zA-Z_]\w*$/.test(tok.value) && this.peek(i + 1).value === '(') {
            return true;
        }
        return false;
    }

    parseFunction() {
        const startTok = this.peek();
        let isStatic = false;
        let returnType = 'void';

        while (['public', 'private', 'protected', 'static'].includes(this.peek().value)) {
            const m = this.consume().value;
            if (m === 'static') isStatic = true;
        }

        // Return type
        returnType = this.consume().value;

        // Function name
        const nameTok = this.expectIdentifier('שם פונקציה');
        const name = nameTok.value;

        this.expect('(');
        const params = [];
        while (this.peek().value !== ')' && this.pos < this.tokens.length) {
            const type = this.consume().value;
            const paramName = this.expectIdentifier('שם פרמטר').value;
            params.push({ type, name: paramName });
            if (this.peek().value === ',') {
                this.consume();
            }
        }
        this.expect(')');

        this.expect('{');
        const body = [];
        while (this.peek().value !== '}' && this.pos < this.tokens.length) {
            body.push(this.parseStatement());
        }
        this.expect('}');

        return {
            type: 'FunctionDeclaration',
            name,
            returnType,
            params,
            body,
            line: startTok.line
        };
    }

    parseStatement() {
        const tok = this.peek();

        // בלוק { ... }
        if (tok.value === '{') {
            this.consume();
            const statements = [];
            while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                statements.push(this.parseStatement());
            }
            this.expect('}');
            return { type: 'BlockStatement', statements, line: tok.line };
        }

        // while (...)
        if (tok.value === 'while') {
            this.consume();
            this.expect('(');
            const condition = this.parseExpression();
            this.expect(')');
            const body = this.parseStatement();
            return { type: 'WhileStatement', condition, body, line: tok.line };
        }

        // if (...)
        if (tok.value === 'if') {
            this.consume();
            this.expect('(');
            const condition = this.parseExpression();
            this.expect(')');
            const consequent = this.parseStatement();
            let alternate = null;
            if (this.match('else')) {
                alternate = this.parseStatement();
            }
            return { type: 'IfStatement', condition, consequent, alternate, line: tok.line };
        }

        // return ...;
        if (tok.value === 'return') {
            this.consume();
            let value = null;
            if (this.peek().value !== ';') {
                value = this.parseExpression();
            }
            this.expect(';');
            return { type: 'ReturnStatement', value, line: tok.line };
        }

        // הצהרת משתנה: int x = 5;, Queue<int> temp = new Queue<int>();
        if (this.isType(tok.value)) {
            const varType = this.consume().value;
            const varName = this.expectIdentifier('שם משתנה').value;
            let init = null;
            if (this.match('=')) {
                init = this.parseExpression();
            }
            this.expect(';');
            return {
                type: 'VariableDeclaration',
                varType,
                varName,
                init,
                line: tok.line
            };
        }

        // השמה או קריאה לפעולה: x = 10;, count++; q.Insert(x);
        const expr = this.parseExpression();
        this.expect(';');
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: tok.line
        };
    }

    isType(val) {
        return ['int', 'char', 'double', 'bool', 'string', 'void', 'var'].includes(val) || val.startsWith('Queue');
    }

    expectIdentifier(desc = 'מזהה') {
        const tok = this.peek();
        if (!/^[a-zA-Z_]\w*$/.test(tok.value)) {
            throw {
                line: tok.line > 0 ? tok.line : 1,
                message: `ציפייה ל-${desc}, אך נמצא '${tok.value}'`
            };
        }
        return this.consume();
    }

    parseExpression() {
        return this.parseAssignment();
    }

    parseAssignment() {
        const expr = this.parseLogicalOr();

        if (['=', '+=', '-=', '*=', '/='].includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseAssignment();
            return {
                type: 'AssignmentExpression',
                operator: op,
                left: expr,
                right: right,
                line: expr.line
            };
        }

        if (['++', '--'].includes(this.peek().value)) {
            const op = this.consume().value;
            return {
                type: 'UpdateExpression',
                operator: op,
                argument: expr,
                line: expr.line
            };
        }

        return expr;
    }

    parseLogicalOr() {
        let left = this.parseLogicalAnd();
        while (this.peek().value === '||') {
            const op = this.consume().value;
            const right = this.parseLogicalAnd();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseLogicalAnd() {
        let left = this.parseEquality();
        while (this.peek().value === '&&') {
            const op = this.consume().value;
            const right = this.parseEquality();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseEquality() {
        let left = this.parseRelational();
        while (['==', '!='].includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseRelational();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseRelational() {
        let left = this.parseAdditive();
        while (['<', '<=', '>', '>='].includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseAdditive();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        while (['+', '-'].includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseMultiplicative();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        while (['*', '/', '%'].includes(this.peek().value)) {
            const op = this.consume().value;
            const right = this.parseUnary();
            left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        }
        return left;
    }

    parseUnary() {
        if (['!', '-', '+'].includes(this.peek().value)) {
            const op = this.consume().value;
            const arg = this.parseUnary();
            return { type: 'UnaryExpression', operator: op, argument: arg, line: arg.line };
        }
        return this.parseMemberOrCall();
    }

    parseMemberOrCall() {
        let expr = this.parsePrimary();

        while (true) {
            if (this.match('.')) {
                const prop = this.expectIdentifier('שם פעולה / שדה').value;
                if (this.match('(')) {
                    const args = [];
                    while (this.peek().value !== ')' && this.pos < this.tokens.length) {
                        args.push(this.parseExpression());
                        if (this.peek().value === ',') this.consume();
                    }
                    this.expect(')');
                    expr = {
                        type: 'MethodCallExpression',
                        object: expr,
                        method: prop,
                        arguments: args,
                        line: expr.line
                    };
                } else {
                    expr = {
                        type: 'MemberExpression',
                        object: expr,
                        property: prop,
                        line: expr.line
                    };
                }
            } else if (this.peek().value === '(' && expr.type === 'Identifier') {
                this.consume();
                const args = [];
                while (this.peek().value !== ')' && this.pos < this.tokens.length) {
                    args.push(this.parseExpression());
                    if (this.peek().value === ',') this.consume();
                }
                this.expect(')');
                expr = {
                    type: 'FunctionCallExpression',
                    callee: expr.name,
                    arguments: args,
                    line: expr.line
                };
            } else {
                break;
            }
        }

        return expr;
    }

    parsePrimary() {
        const tok = this.peek();

        // ביטוי בסוגריים
        if (tok.value === '(') {
            this.consume();
            const expr = this.parseExpression();
            this.expect(')');
            return expr;
        }

        // new Queue<int>()
        if (tok.value === 'new') {
            this.consume();
            const typeTok = this.consume();
            this.expect('(');
            this.expect(')');
            return {
                type: 'NewExpression',
                className: typeTok.value,
                line: tok.line
            };
        }

        // מספרים
        if (/^-?\d+(\.\d+)?$/.test(tok.value)) {
            this.consume();
            return { type: 'Literal', value: Number(tok.value), raw: tok.value, line: tok.line };
        }

        // מחרוזות
        if (tok.value.startsWith('"') && tok.value.endsWith('"')) {
            this.consume();
            return { type: 'Literal', value: tok.value.slice(1, -1), raw: tok.value, isString: true, line: tok.line };
        }

        // תווים (char)
        if (tok.value.startsWith("'") && tok.value.endsWith("'") && tok.value.length >= 3) {
            this.consume();
            let charVal = tok.value.slice(1, -1);
            if (charVal === '\\n') charVal = '\n';
            else if (charVal === '\\t') charVal = '\t';
            else if (charVal === '\\\\') charVal = '\\';
            else if (charVal === "\\'") charVal = "'";
            return { type: 'Literal', value: charVal, raw: tok.value, isChar: true, line: tok.line };
        }

        // בוליאני
        if (tok.value === 'true' || tok.value === 'false') {
            this.consume();
            return { type: 'Literal', value: tok.value === 'true', raw: tok.value, line: tok.line };
        }

        // מזהה משתנה
        if (/^[a-zA-Z_]\w*$/.test(tok.value)) {
            this.consume();
            return { type: 'Identifier', name: tok.value, line: tok.line };
        }

        throw {
            line: tok.line > 0 ? tok.line : 1,
            message: `תחביר לא מוכר: '${tok.value}'`
        };
    }
}

/**
 * מודל התור (Queue)
 */
class QueueInstance {
    constructor(name, initialItems = [], itemType = 'int') {
        this.id = 'q_' + Math.random().toString(36).substring(2, 9);
        this.name = name;
        this.itemType = itemType;
        this.items = [...initialItems]; // index 0 = Head, index length-1 = Tail
        this.lastOp = 'none';
        this.targetVal = null;
    }

    insert(val) {
        this.items.push(val);
        this.lastOp = 'insert';
        this.targetVal = val;
    }

    remove() {
        if (this.isEmpty()) {
            throw new Error(`QueueEmptyException: ניסיון להוציא איבר (Remove) מתוך תור '${this.name}' כשהוא ריק!`);
        }
        const val = this.items.shift();
        this.lastOp = 'remove';
        this.targetVal = val;
        return val;
    }

    head() {
        if (this.isEmpty()) {
            throw new Error(`QueueEmptyException: ניסיון להציץ בראש התור (Head) בתור '${this.name}' כשהוא ריק!`);
        }
        this.lastOp = 'head';
        this.targetVal = this.items[0];
        return this.items[0];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    clone(newName) {
        const copy = new QueueInstance(newName || this.name, this.items, this.itemType);
        return copy;
    }

    toString() {
        return `[${this.items.join(', ')}]`;
    }
}

/**
 * סביבת הרצה המייצרת את ה-Trace עבור הדיבאגר
 */
class RuntimeEnvironment {
    constructor(ast, initialValues, maxSteps = 1500) {
        this.ast = ast;
        this.initialValues = initialValues || [];
        this.maxSteps = maxSteps;
        this.stepCount = 0;
        this.frames = [];

        // מפת התורים הפעילים (תתחיל ריקה אלא אם כן נזהה פרמטר Queue בארגומנטים)
        this.queues = new Map();
        this.hasInitialQueue = false;
        this.initialQueueName = null;
        this.initialQueueSnapshot = [];

        // פונקציות זמינות
        this.functions = new Map();
        for (const fn of ast.functions) {
            this.functions.set(fn.name, fn);
        }

        // מחסנית קריאות
        this.callStack = [];

        // פלט מסוף (Console Output)
        this.consoleOutputs = [];
    }

    execute() {
        this.consoleOutputs = [];
        let entryFunction = null;
        if (this.functions.has('Main')) {
            entryFunction = this.functions.get('Main');
        } else if (this.functions.size > 0) {
            // אם אין Main, נבחר את הפונקציה הראשונה שהוגדרה
            entryFunction = this.ast.functions[0];
        }

        const initialArgs = [];
        this.initialQueueType = 'int';

        // בדיקה האם יש פרמטרים מסוג Queue<T> בארגומנטים של פונקציית הכניסה
        if (entryFunction) {
            for (const param of entryFunction.params) {
                if (param.type.startsWith('Queue')) {
                    const match = param.type.match(/Queue<([^>]+)>/);
                    const qType = match ? match[1].trim() : 'int';
                    const queueInst = new QueueInstance(param.name, this.initialValues, qType);
                    this.queues.set(param.name, queueInst);
                    initialArgs.push(queueInst);
                    if (!this.hasInitialQueue) {
                        this.hasInitialQueue = true;
                        this.initialQueueName = param.name;
                        this.initialQueueType = qType;
                        this.initialQueueSnapshot = [...this.initialValues];
                    }
                } else {
                    initialArgs.push(0);
                }
            }
        }

        // הוספת פסיעת התחלה
        const startMsg = this.hasInitialQueue
            ? `התחלת ריצת התוכנית (אותחל תור התחלתי ${this.initialQueueName})`
            : 'התחלת ריצת התוכנית';
        this.recordFrame(1, startMsg, 'idle');

        if (entryFunction) {
            this.executeFunction(entryFunction, initialArgs);
        } else if (this.ast.topLevelStatements.length > 0) {
            // ריצה ישירה של פקודות
            const scope = new Map();
            this.callStack.push({ funcName: 'תוכנית ראשית', scope, line: 1 });
            for (const stmt of this.ast.topLevelStatements) {
                this.executeStatement(stmt, scope);
            }
            this.callStack.pop();
        }

        // בדיקת שימור תור מקורי בסיום - רק אם הפונקציה קיבלה תור התחלתי כפרמטר!
        let originalPreserved = true;
        let endDesc = 'התוכנית הסתיימה בהצלחה!';

        if (this.hasInitialQueue && this.initialQueueName) {
            const finalQ = this.queues.get(this.initialQueueName);
            if (!finalQ || finalQ.items.length !== this.initialQueueSnapshot.length) {
                originalPreserved = false;
            } else {
                for (let i = 0; i < this.initialQueueSnapshot.length; i++) {
                    if (finalQ.items[i] !== this.initialQueueSnapshot[i]) {
                        originalPreserved = false;
                        break;
                    }
                }
            }

            endDesc = originalPreserved
                ? `התוכנית הסתיימה בהצלחה! התור המקורי ${this.initialQueueName} נשמר במלואו כנדרש בבגרות.`
                : `התוכנית הסתיימה, אך שים לב: התור המקורי ${this.initialQueueName} לא שוחזר למצבו המקורי (הפרת כלל הברזל בבגרות)!`;
        }

        this.recordFrame(this.frames.length > 0 ? this.frames[this.frames.length - 1].line : 1, endDesc, 'idle', true, originalPreserved);

        return {
            frames: this.frames,
            error: null,
            hasInitialQueue: this.hasInitialQueue,
            initialQueueName: this.initialQueueName,
            initialQueueType: this.initialQueueType || 'int',
            originalPreserved
        };
    }

    executeFunction(fn, args = []) {
        const scope = new Map();

        // השמת פרמטרים
        for (let i = 0; i < fn.params.length; i++) {
            const param = fn.params[i];
            const argVal = args[i] !== undefined ? args[i] : null;
            scope.set(param.name, argVal);

            // אם הפרמטר הוא תור, נרשום אותו במפת התורים
            if (argVal instanceof QueueInstance) {
                this.queues.set(param.name, argVal);
            }
        }

        const frameInfo = {
            funcName: `${fn.name}(${fn.params.map(p => p.name).join(', ')})`,
            scope,
            line: fn.line
        };
        this.callStack.push(frameInfo);

        this.recordFrame(fn.line, `כניסה לפונקציה ${fn.name}`);

        let returnVal = undefined;
        try {
            for (const stmt of fn.body) {
                returnVal = this.executeStatement(stmt, scope);
                if (returnVal !== undefined && stmt.type === 'ReturnStatement') {
                    break;
                }
            }
        } finally {
            this.callStack.pop();
            this.recordFrame(fn.line, `סיום פונקציה ${fn.name}${returnVal !== undefined ? `, הוחזר: ${this.formatVal(returnVal)}` : ''}`);
        }

        return returnVal;
    }

    executeStatement(stmt, scope) {
        this.checkStepLimit(stmt.line);

        switch (stmt.type) {
            case 'BlockStatement': {
                for (const s of stmt.statements) {
                    const ret = this.executeStatement(s, scope);
                    if (ret !== undefined) return ret;
                }
                break;
            }

            case 'VariableDeclaration': {
                let val = null;
                if (stmt.init) {
                    val = this.evaluateExpression(stmt.init, scope);
                }
                const isQueue = stmt.varType.startsWith('Queue') || (val instanceof QueueInstance);
                if (isQueue) {
                    const match = stmt.varType.match(/Queue<([^>]+)>/);
                    const qType = match ? match[1].trim() : (val instanceof QueueInstance ? (val.itemType || 'int') : 'int');
                    if (!(val instanceof QueueInstance)) {
                        val = new QueueInstance(stmt.varName, [], qType);
                    } else {
                        val.name = stmt.varName;
                        if (!val.itemType) val.itemType = qType;
                    }
                    this.queues.set(stmt.varName, val);
                    scope.set(stmt.varName, val);
                    this.recordFrame(stmt.line, `אתחול ויצירת תור חדש בחלון: ${stmt.varName} = new ${stmt.varType || 'Queue'}()`, 'idle', false, null, stmt.varName);
                } else {
                    scope.set(stmt.varName, val);
                    this.recordFrame(stmt.line, `הצהרה על משתנה ${stmt.varName} = ${this.formatVal(val)}`);
                }
                break;
            }

            case 'ExpressionStatement': {
                this.evaluateExpression(stmt.expression, scope);
                break;
            }

            case 'WhileStatement': {
                while (true) {
                    this.checkStepLimit(stmt.line);
                    const cond = Boolean(this.evaluateExpression(stmt.condition, scope));
                    this.recordFrame(stmt.line, `בדיקת תנאי לולאת while: התוצאה היא ${cond ? 'אמת (true)' : 'שקר (false)'}`);
                    if (!cond) break;

                    const ret = this.executeStatement(stmt.body, scope);
                    if (ret !== undefined) return ret;
                }
                break;
            }

            case 'IfStatement': {
                const cond = Boolean(this.evaluateExpression(stmt.condition, scope));
                this.recordFrame(stmt.line, `בדיקת תנאי if: התוצאה היא ${cond ? 'אמת (true)' : 'שקר (false)'}`);
                if (cond) {
                    const ret = this.executeStatement(stmt.consequent, scope);
                    if (ret !== undefined) return ret;
                } else if (stmt.alternate) {
                    const ret = this.executeStatement(stmt.alternate, scope);
                    if (ret !== undefined) return ret;
                }
                break;
            }

            case 'ReturnStatement': {
                let val = undefined;
                if (stmt.value) {
                    val = this.evaluateExpression(stmt.value, scope);
                }
                this.recordFrame(stmt.line, `ביצוע return: מחזיר ${this.formatVal(val)}`);
                return val;
            }
        }
    }

    evaluateExpression(expr, scope) {
        if (!expr) return null;

        switch (expr.type) {
            case 'Literal':
                return expr.value;

            case 'Identifier': {
                if (scope.has(expr.name)) {
                    return scope.get(expr.name);
                }
                if (this.queues.has(expr.name)) {
                    return this.queues.get(expr.name);
                }
                // ערך ברירת מחדל או שגיאה
                return 0;
            }

            case 'UnaryExpression': {
                const arg = this.evaluateExpression(expr.argument, scope);
                if (expr.operator === '!') return !arg;
                if (expr.operator === '-') return -arg;
                if (expr.operator === '+') return +arg;
                return arg;
            }

            case 'BinaryExpression': {
                const left = this.evaluateExpression(expr.left, scope);
                const right = this.evaluateExpression(expr.right, scope);
                switch (expr.operator) {
                    case '+': {
                        if (typeof left === 'string' || typeof right === 'string') {
                            return this.formatVal(left) + this.formatVal(right);
                        }
                        return left + right;
                    }
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return right !== 0 ? Math.trunc(left / right) : 0;
                    case '%': return right !== 0 ? left % right : 0;
                    case '==': return left === right;
                    case '!=': return left !== right;
                    case '<': return left < right;
                    case '<=': return left <= right;
                    case '>': return left > right;
                    case '>=': return left >= right;
                    case '&&': return Boolean(left && right);
                    case '||': return Boolean(left || right);
                    default: return 0;
                }
            }

            case 'AssignmentExpression': {
                let targetName = null;
                if (expr.left.type === 'Identifier') {
                    targetName = expr.left.name;
                } else {
                    throw { line: expr.line, message: 'השמה מותרת רק למשתנה' };
                }

                const rightVal = this.evaluateExpression(expr.right, scope);
                let currentVal = scope.has(targetName) ? scope.get(targetName) : 0;
                let finalVal = rightVal;

                if (expr.operator === '+=') finalVal = currentVal + rightVal;
                else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                scope.set(targetName, finalVal);
                if (finalVal instanceof QueueInstance) {
                    finalVal.name = targetName;
                    this.queues.set(targetName, finalVal);
                    this.recordFrame(expr.line, `אתחול והשמת תור חדש בחלון: ${targetName} = new Queue()`, 'idle', false, null, targetName);
                    return finalVal;
                }

                this.recordFrame(expr.line, `השמה: ${targetName} = ${this.formatVal(finalVal)}`);
                return finalVal;
            }

            case 'UpdateExpression': {
                const varName = expr.argument.name;
                let currentVal = scope.has(varName) ? scope.get(varName) : 0;
                if (expr.operator === '++') currentVal++;
                else if (expr.operator === '--') currentVal--;
                scope.set(varName, currentVal);
                this.recordFrame(expr.line, `קידום משתנה: ${varName} הפך ל-${currentVal}`);
                return currentVal;
            }

            case 'NewExpression': {
                if (expr.className.startsWith('Queue')) {
                    const match = expr.className.match(/Queue<([^>]+)>/);
                    const qType = match ? match[1].trim() : 'int';
                    const newQ = new QueueInstance('temp_' + (this.queues.size + 1), [], qType);
                    return newQ;
                }
                return {};
            }

            case 'MethodCallExpression': {
                // בדיקת קריאה ל-Console.WriteLine / Console.Write / System.Console.WriteLine
                const isConsoleCall = (
                    (expr.object && expr.object.type === 'Identifier' && expr.object.name === 'Console') ||
                    (expr.object && expr.object.type === 'MemberExpression' && expr.object.property === 'Console') ||
                    expr.object === 'Console'
                );

                if (isConsoleCall && (expr.method === 'WriteLine' || expr.method === 'Write')) {
                    let out = '';
                    if (expr.arguments && expr.arguments.length > 0) {
                        const evalArgs = expr.arguments.map(arg => this.evaluateExpression(arg, scope));
                        if (typeof evalArgs[0] === 'string' && /\{\d+\}/.test(evalArgs[0])) {
                            let fmt = evalArgs[0];
                            for (let i = 1; i < evalArgs.length; i++) {
                                fmt = fmt.replaceAll(`{${i - 1}}`, this.formatVal(evalArgs[i]));
                            }
                            out = fmt;
                        } else {
                            out = evalArgs.map(v => this.formatVal(v)).join(' ');
                        }
                    }
                    this.consoleOutputs.push(out);
                    this.recordFrame(expr.line, `פלט מסוף (Console.${expr.method}): ${out}`, 'idle');
                    return null;
                }

                const obj = this.evaluateExpression(expr.object, scope);

                // תמיכה ב-ToString()
                if (expr.method === 'ToString') {
                    return this.formatVal(obj);
                }

                if (obj instanceof QueueInstance) {
                    const methodName = expr.method;
                    if (methodName === 'Insert') {
                        const insertVal = this.evaluateExpression(expr.arguments[0], scope);
                        obj.insert(insertVal);
                        this.recordFrame(expr.line, `פעולת ${obj.name}.Insert(${insertVal}): הכנסת ${insertVal} לסוף התור`, 'insert', false, null, obj.name, insertVal);
                        return null;
                    } else if (methodName === 'Remove') {
                        try {
                            const removedVal = obj.remove();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Remove(): הוצאת ${removedVal} מראש התור`, 'remove', false, null, obj.name, removedVal);
                            return removedVal;
                        } catch (err) {
                            throw { line: expr.line, message: err.message };
                        }
                    } else if (methodName === 'Head') {
                        try {
                            const headVal = obj.head();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Head(): הצצה בראש התור (${headVal}) ללא שינוי`, 'head', false, null, obj.name, headVal);
                            return headVal;
                        } catch (err) {
                            throw { line: expr.line, message: err.message };
                        }
                    } else if (methodName === 'IsEmpty') {
                        const isEmpty = obj.isEmpty();
                        this.recordFrame(expr.line, `פעולת ${obj.name}.IsEmpty(): בדיקה האם ריק -> ${isEmpty ? 'אמת (true)' : 'שקר (false)'}`);
                        return isEmpty;
                    } else {
                        throw { line: expr.line, message: `פעולה לא מוכרת '${methodName}' בתור` };
                    }
                }
                const targetObjName = expr.object && expr.object.name ? `'${expr.object.name}'` : 'האובייקט';
                throw { line: expr.line, message: `${targetObjName} אינו תור מאותחל (האם שכחת להגדירו או לקרוא ל-new Queue<int>()?)` };
            }

            case 'FunctionCallExpression': {
                const funcName = expr.callee;
                if (this.functions.has(funcName)) {
                    const targetFn = this.functions.get(funcName);
                    const evalArgs = expr.arguments.map(arg => this.evaluateExpression(arg, scope));
                    this.recordFrame(expr.line, `קריאה לפונקציה ${funcName}(${evalArgs.map(v => this.formatVal(v)).join(', ')})`);
                    return this.executeFunction(targetFn, evalArgs);
                } else if (funcName === 'Console' || funcName === 'WriteLine' || funcName === 'print') {
                    let out = '';
                    if (expr.arguments && expr.arguments.length > 0) {
                        const evalArgs = expr.arguments.map(arg => this.evaluateExpression(arg, scope));
                        if (typeof evalArgs[0] === 'string' && /\{\d+\}/.test(evalArgs[0])) {
                            let fmt = evalArgs[0];
                            for (let i = 1; i < evalArgs.length; i++) {
                                fmt = fmt.replaceAll(`{${i - 1}}`, this.formatVal(evalArgs[i]));
                            }
                            out = fmt;
                        } else {
                            out = evalArgs.map(v => this.formatVal(v)).join(' ');
                        }
                    }
                    this.consoleOutputs.push(out);
                    this.recordFrame(expr.line, `פלט מסוף (${funcName}): ${out}`, 'idle');
                    return null;
                }
                throw { line: expr.line, message: `פונקציה '${funcName}' אינה מוגדרת בקוד` };
            }
        }

        return null;
    }

    recordFrame(line, description, opType = 'idle', isCompleted = false, originalPreserved = null, targetQueueName = null, targetValue = null) {
        this.stepCount++;

        // שכפול מצב התורים
        const queuesSnapshot = [];
        this.queues.forEach((qInst, qName) => {
            queuesSnapshot.push({
                name: qName,
                id: qInst.id,
                itemType: qInst.itemType || 'int',
                items: [...qInst.items],
                lastOp: (targetQueueName === qName) ? opType : 'none',
                targetVal: (targetQueueName === qName) ? targetValue : null
            });
        });

        // שכפול Call Stack ומפת המשתנים הפעילה
        const callStackSnapshot = this.callStack.map(f => {
            const vars = {};
            f.scope.forEach((v, k) => {
                vars[k] = this.formatVal(v);
            });
            return {
                funcName: f.funcName,
                line: f.line,
                variables: vars
            };
        });

        const activeVariables = callStackSnapshot.length > 0
            ? callStackSnapshot[callStackSnapshot.length - 1].variables
            : {};

        this.frames.push({
            step: this.frames.length,
            line,
            description,
            callStack: callStackSnapshot,
            queues: queuesSnapshot,
            variables: activeVariables,
            consoleOutputs: [...this.consoleOutputs],
            error: null,
            isCompleted,
            originalPreserved
        });
    }

    checkStepLimit(line) {
        if (this.stepCount > this.maxSteps) {
            throw {
                line,
                message: `עצירת חירום: התוכנית עברה את מגבלת ${this.maxSteps} הצעדים (חשד ללולאה אינסופית או רקורסיה לא מרוסנת)!`
            };
        }
    }

    formatVal(val) {
        if (val instanceof QueueInstance) {
            return `Queue [${val.items.join(', ')}]`;
        }
        if (typeof val === 'boolean') {
            return val ? 'true' : 'false';
        }
        if (typeof val === 'string') {
            return val;
        }
        if (val === null || val === undefined) {
            return 'null';
        }
        return String(val);
    }
}

// ייצוא גלובלי לשימוש בדפדפן או Node
if (typeof window !== 'undefined') {
    window.CSharpQueueInterpreter = CSharpQueueInterpreter;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSharpQueueInterpreter, QueueInstance, RuntimeEnvironment };
}
