/**
 * C# Queue Interpreter & Execution Tracer
 * אלון שרייבמן - מגמת מדעי המחשב
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
            this.ast = ast;
            this.classes = new Map();
            if (ast.classes) {
                for (const cls of ast.classes) {
                    this.classes.set(cls.name, cls);
                }
            }
            runtime = new RuntimeEnvironment(ast, initialQueueValues, this.maxSteps);
            const trace = runtime.execute();
            trace.classes = this.classes;
            trace.ast = ast;
            return trace;
        } catch (err) {
            if (!this.classes) this.classes = new Map();
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
        const regex = /\s*(==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>|[(){}\[\],;+\-*\/%<>=!.]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'|[a-zA-Z_]\w*(?:<[a-zA-Z0-9_,\s]*(?:<[a-zA-Z0-9_,\s]*(?:<[a-zA-Z0-9_,\s]*>)?>)?>)?|-?\d+(?:\.\d+)?)\s*/g;
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

    isClassStart() {
        let i = 0;
        while (['public', 'private', 'protected', 'internal', 'static', 'sealed', 'abstract'].includes(this.peek(i).value)) {
            i++;
        }
        return this.peek(i).value === 'class';
    }

    parseProgram() {
        this.knownClasses = new Set();
        for (let i = 0; i < this.tokens.length - 1; i++) {
            if (this.tokens[i].value === 'class' && /^[a-zA-Z_]\w*$/.test(this.tokens[i + 1].value)) {
                this.knownClasses.add(this.tokens[i + 1].value);
            }
        }

        const classes = [];
        const functions = [];
        const topLevelStatements = [];

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

            // זיהוי הגדרת מחלקה (כולל מודפיקטורים מקדימים: public, private, static וכו')
            if (this.isClassStart()) {
                let classAccess = 'public';
                while (['public', 'private', 'protected', 'internal', 'static', 'sealed', 'abstract'].includes(this.peek().value)) {
                    const mod = this.consume().value;
                    if (mod === 'public' || mod === 'private' || mod === 'protected' || mod === 'internal') {
                        classAccess = mod;
                    }
                }
                const cls = this.parseClass(classAccess);
                classes.push(cls);

                // הוספת מחלקות מקוננות אם הוגדרו בתוך המחלקה
                if (cls.nestedClasses && cls.nestedClasses.length > 0) {
                    for (const nCls of cls.nestedClasses) {
                        classes.push(nCls);
                    }
                }

                // הוספת פעולות סטטיות (כולל Main) לרשימת הפונקציות הכללית לקריאה ישירה
                for (const m of cls.methods) {
                    if (m.isStatic || m.name === 'Main') {
                        functions.push(m);
                    }
                }
                continue;
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
            classes,
            functions,
            topLevelStatements
        };
    }

    parseClass(classAccess = 'public') {
        const classTok = this.consume(); // 'class'
        const nameTok = this.expectIdentifier('שם מחלקה');
        const className = nameTok.value;
        this.expect('{');
        const fields = [];
        const properties = [];
        const constructors = [];
        const methods = [];
        const nestedClasses = [];

        while (this.pos < this.tokens.length && this.peek().value !== '}') {
            // בדיקה האם זו מחלקה מקוננת (Nested Class)
            if (this.isClassStart()) {
                let nestedAccess = 'private';
                while (['public', 'private', 'protected', 'internal', 'static', 'sealed', 'abstract'].includes(this.peek().value)) {
                    const mod = this.consume().value;
                    if (mod === 'public' || mod === 'private' || mod === 'protected' || mod === 'internal') {
                        nestedAccess = mod;
                    }
                }
                const nestedCls = this.parseClass(nestedAccess);
                nestedClasses.push(nestedCls);
                continue;
            }

            // מודפיקטורים: public, private, protected, static, override, virtual
            let access = 'private'; // ברירת מחדל ב-C# לחברי מחלקה היא private
            let hasExplicitAccess = false;
            let isStatic = false;
            let isOverride = false;
            let isVirtual = false;

            while (['public', 'private', 'protected', 'internal', 'static', 'override', 'virtual'].includes(this.peek().value)) {
                const m = this.consume().value;
                if (m === 'public' || m === 'private' || m === 'protected' || m === 'internal') {
                    access = m;
                    hasExplicitAccess = true;
                }
                if (m === 'static') isStatic = true;
                if (m === 'override') isOverride = true;
                if (m === 'virtual') isVirtual = true;
            }

            // בנאי Constructor: className(params) { ... }
            if (this.peek().value === className && this.peek(1).value === '(') {
                this.consume(); // className
                this.expect('(');
                const params = [];
                while (this.peek().value !== ')' && this.pos < this.tokens.length) {
                    const type = this.consume().value;
                    const paramName = this.expectIdentifier('שם פרמטר בנאי').value;
                    params.push({ type, name: paramName });
                    if (this.peek().value === ',') this.consume();
                }
                this.expect(')');
                this.expect('{');
                const body = [];
                while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                    body.push(this.parseStatement());
                }
                this.expect('}');
                constructors.push({
                    access: hasExplicitAccess ? access : 'public',
                    params,
                    body,
                    line: classTok.line
                });
                continue;
            }

            // טיפול בשדה, מאפיין (Property) או מתודה
            const memberType = this.consume().value;
            const memberName = this.expectIdentifier('שם שדה, מאפיין או פעולה').value;

            // תמיכה מלאה במאפיין (Property) עם בלוק סוגריים מסולסלים: { get; set; }
            if (this.peek().value === '{') {
                this.consume(); // '{'
                let getter = null;
                let setter = null;

                while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                    let acc = access;
                    if (['public', 'private', 'protected', 'internal'].includes(this.peek().value)) {
                        acc = this.consume().value;
                    }

                    const accessorType = this.peek().value;
                    if (accessorType === 'get') {
                        this.consume(); // 'get'
                        if (this.match(';')) {
                            getter = { isAuto: true, access: acc };
                        } else if (this.match('{')) {
                            const body = [];
                            while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                                body.push(this.parseStatement());
                            }
                            this.expect('}');
                            getter = { isAuto: false, access: acc, body };
                        } else if (this.match('=>')) {
                            const expr = this.parseExpression();
                            this.expect(';');
                            getter = { isAuto: false, access: acc, body: [{ type: 'ReturnStatement', argument: expr, line: classTok.line }] };
                        }
                    } else if (accessorType === 'set') {
                        this.consume(); // 'set'
                        if (this.match(';')) {
                            setter = { isAuto: true, access: acc };
                        } else if (this.match('{')) {
                            const body = [];
                            while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                                body.push(this.parseStatement());
                            }
                            this.expect('}');
                            setter = { isAuto: false, access: acc, body };
                        } else if (this.match('=>')) {
                            const expr = this.parseExpression();
                            this.expect(';');
                            setter = { isAuto: false, access: acc, body: [{ type: 'ExpressionStatement', expression: expr, line: classTok.line }] };
                        }
                    } else {
                        this.consume();
                    }
                }
                this.expect('}');

                let init = null;
                if (this.match('=')) {
                    init = this.parseExpression();
                    this.expect(';');
                }

                properties.push({
                    name: memberName,
                    type: memberType,
                    access,
                    getter,
                    setter,
                    init,
                    line: classTok.line
                });
                continue;
            } else if (this.match('=>')) {
                // Expression-bodied property: public int X => this.x;
                const expr = this.parseExpression();
                this.expect(';');
                properties.push({
                    name: memberName,
                    type: memberType,
                    access,
                    getter: { isAuto: false, access, body: [{ type: 'ReturnStatement', argument: expr, line: classTok.line }] },
                    setter: null,
                    init: null,
                    line: classTok.line
                });
                continue;
            }

            // בדיקה האם זו מתודה
            if (this.match('(')) {
                const params = [];
                while (this.peek().value !== ')' && this.pos < this.tokens.length) {
                    const type = this.consume().value;
                    const paramName = this.expectIdentifier('שם פרמטר').value;
                    params.push({ type, name: paramName });
                    if (this.peek().value === ',') this.consume();
                }
                this.expect(')');
                this.expect('{');
                const body = [];
                while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                    body.push(this.parseStatement());
                }
                this.expect('}');
                methods.push({
                    name: memberName,
                    returnType: memberType,
                    access,
                    isStatic,
                    isOverride,
                    isVirtual,
                    params,
                    body,
                    line: classTok.line
                });
            } else {
                // שדה (Field) - תמיכה גם בהגדרה מרובה: int x, y;
                const fieldNames = [memberName];
                while (this.match(',')) {
                    fieldNames.push(this.expectIdentifier('שם שדה נוסף').value);
                }
                let init = null;
                if (this.match('=')) {
                    init = this.parseExpression();
                }
                this.expect(';');
                for (const fn of fieldNames) {
                    fields.push({ name: fn, type: memberType, access, init, line: classTok.line });
                }
            }
        }
        this.expect('}');

        return {
            type: 'ClassDeclaration',
            name: className,
            access: classAccess,
            fields,
            properties,
            constructors,
            methods,
            nestedClasses,
            line: classTok.line
        };
    }

    isFunctionStart() {
        let i = 0;
        let tok = this.peek(i);
        while (['public', 'private', 'protected', 'static', 'override', 'virtual', 'void', 'int', 'char', 'bool', 'double', 'string', 'var'].includes(tok.value) ||
               tok.value.startsWith('Queue<') || tok.value.startsWith('Queue') || (this.knownClasses && this.knownClasses.has(tok.value))) {
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
        if (!val) return false;
        if (['int', 'char', 'double', 'bool', 'string', 'void', 'var'].includes(val)) return true;
        if (val.startsWith('Queue')) return true;
        if (this.knownClasses && this.knownClasses.has(val)) return true;
        const next = this.peek(1);
        const nextNext = this.peek(2);
        if (/^[a-zA-Z_]\w*$/.test(val) && /^[a-zA-Z_]\w*$/.test(next.value) && ['=', ';', ','].includes(nextNext.value)) {
            return true;
        }
        return false;
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

        // this keyword
        if (tok.value === 'this') {
            this.consume();
            return { type: 'ThisExpression', line: tok.line };
        }

        // new Queue<int>() / new Point(10, 20) / new Queue<Queue<int>>()
        if (tok.value === 'new') {
            this.consume();
            const typeTok = this.consume();
            this.expect('(');
            const args = [];
            while (this.peek().value !== ')' && this.pos < this.tokens.length) {
                args.push(this.parseExpression());
                if (this.peek().value === ',') this.consume();
            }
            this.expect(')');
            return {
                type: 'NewExpression',
                className: typeTok.value,
                arguments: args,
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
 * מודל מופע מחלקה (Class Instance) עבור מחלקות מותאמות אישית
 */
class ClassInstance {
    constructor(className, initialFields = {}, fieldMeta = new Map(), properties = new Map()) {
        this.id = 'obj_' + Math.random().toString(36).substring(2, 9);
        this.className = className;
        this.fields = { ...initialFields };
        this.fieldMeta = fieldMeta;
        this.properties = properties;
        this.methods = new Map();
    }

    clone() {
        const copy = new ClassInstance(this.className);
        copy.id = this.id;
        copy.methods = this.methods;
        copy.fieldMeta = this.fieldMeta;
        copy.properties = this.properties;
        for (const [k, v] of Object.entries(this.fields)) {
            if (v instanceof QueueInstance) {
                copy.fields[k] = v.clone();
            } else if (v instanceof ClassInstance) {
                copy.fields[k] = v.clone();
            } else {
                copy.fields[k] = v;
            }
        }
        return copy;
    }

    toString() {
        const fieldStrs = Object.entries(this.fields).map(([k, v]) => {
            if (v instanceof QueueInstance) return `${k}: Queue[...]`;
            if (v instanceof ClassInstance) return `${k}: ${v.className}`;
            return `${k}: ${v}`;
        });
        return `${this.className} { ${fieldStrs.join(', ')} }`;
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
        const clonedItems = this.items.map(it => {
            if (it instanceof QueueInstance) return it.clone();
            if (it instanceof ClassInstance) return it.clone();
            return it;
        });
        const copy = new QueueInstance(newName || this.name, clonedItems, this.itemType);
        copy.id = this.id;
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

        // מחלקות מותאמות אישית
        this.classes = new Map();
        if (ast.classes) {
            for (const cls of ast.classes) {
                this.classes.set(cls.name, cls);
            }
        }

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
                    const match = param.type.match(/^Queue<(.+)>$/);
                    const qType = match ? match[1].trim() : 'int';
                    let queueInst;
                    if (qType.startsWith('Queue')) {
                        const subType = qType.match(/^Queue<(.+)>$/) ? qType.match(/^Queue<(.+)>$/)[1].trim() : 'int';
                        queueInst = new QueueInstance(param.name, [], qType);
                        this.queues.set(param.name, queueInst);
                        if (Array.isArray(this.initialValues)) {
                            this.initialValues.forEach((sub, sIdx) => {
                                if (sub instanceof QueueInstance) {
                                    queueInst.insert(sub);
                                } else if (Array.isArray(sub)) {
                                    const subQ = new QueueInstance(`sub_${sIdx + 1}`, sub, subType);
                                    this.queues.set(subQ.name, subQ);
                                    queueInst.insert(subQ);
                                }
                            });
                        }
                    } else if (this.classes.has(qType) || (!['int', 'char', 'string', 'bool', 'double', 'float', 'long'].includes(qType) && !qType.startsWith('Queue'))) {
                        const classDecl = this.classes.get(qType);
                        const fieldMeta = new Map();
                        const propMeta = new Map();
                        if (classDecl) {
                            for (const f of classDecl.fields) {
                                fieldMeta.set(f.name, { access: f.access || 'private', type: f.type });
                            }
                            if (classDecl.properties) {
                                for (const p of classDecl.properties) {
                                    propMeta.set(p.name, p);
                                }
                            }
                        }
                        queueInst = new QueueInstance(param.name, [], qType);
                        if (Array.isArray(this.initialValues)) {
                            this.initialValues.forEach(val => {
                                if (val instanceof ClassInstance) {
                                    queueInst.insert(val);
                                } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                                    const rawFields = val.fields || val;
                                    const inst = new ClassInstance(qType, {}, fieldMeta, propMeta);
                                    if (classDecl) {
                                        for (const f of classDecl.fields) {
                                            let defaultVal = 0;
                                            if (f.type === 'string') defaultVal = '';
                                            else if (f.type === 'bool') defaultVal = false;
                                            else if (f.type === 'char') defaultVal = ' ';
                                            inst.fields[f.name] = defaultVal;
                                        }
                                        for (const m of classDecl.methods) {
                                            inst.methods.set(m.name, m);
                                        }
                                    }
                                    Object.assign(inst.fields, rawFields);
                                    queueInst.insert(inst);
                                } else if (Array.isArray(val)) {
                                    const inst = new ClassInstance(qType, {}, fieldMeta, propMeta);
                                    if (classDecl && classDecl.fields && classDecl.fields.length > 0) {
                                        classDecl.fields.forEach((f, fIdx) => {
                                            inst.fields[f.name] = val[fIdx] !== undefined ? val[fIdx] : (f.type === 'string' ? '' : 0);
                                        });
                                        for (const m of classDecl.methods) {
                                            inst.methods.set(m.name, m);
                                        }
                                    } else {
                                        val.forEach((item, idx) => {
                                            inst.fields[`val_${idx + 1}`] = item;
                                        });
                                    }
                                    queueInst.insert(inst);
                                } else if (val !== null && val !== undefined) {
                                    const inst = new ClassInstance(qType, {}, fieldMeta, propMeta);
                                    if (classDecl && classDecl.fields && classDecl.fields.length > 0) {
                                        inst.fields[classDecl.fields[0].name] = val;
                                        for (const m of classDecl.methods) {
                                            inst.methods.set(m.name, m);
                                        }
                                    } else {
                                        inst.fields['value'] = val;
                                    }
                                    queueInst.insert(inst);
                                }
                            });
                        }
                    } else {
                        queueInst = new QueueInstance(param.name, this.initialValues, qType);
                    }
                    this.queues.set(param.name, queueInst);
                    initialArgs.push(queueInst);
                    if (!this.hasInitialQueue) {
                        this.hasInitialQueue = true;
                        this.initialQueueName = param.name;
                        this.initialQueueType = qType;
                        this.initialQueueSnapshot = this.snapshotItems(queueInst.items);
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
                    if (this.formatVal(finalQ.items[i]) !== this.formatVal(this.initialQueueSnapshot[i])) {
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
            originalPreserved,
            consoleOutputs: this.consoleOutputs
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
                    const match = stmt.varType.match(/^Queue<(.+)>$/);
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

    checkAccess(targetObj, access, scope, memberDescription, line) {
        if (!access || access === 'public') return true;

        // האם ההקשר הנוכחי רץ בתוך אותה מחלקה
        const currentThis = scope ? scope.get('this') : null;
        const isSameClass = currentThis && currentThis instanceof ClassInstance && currentThis.className === targetObj.className;

        if (access === 'private') {
            if (!isSameClass) {
                throw {
                    line: line || 1,
                    message: `❌ שגיאת גישה (כימוס): ${memberDescription} מוגדר כ-private במחלקה '${targetObj.className}' ואינו נגיש מחוץ למחלקה. יש להשתמש ב-Getters/Setters או לשנות ל-public.`
                };
            }
        } else if (access === 'protected') {
            if (!isSameClass) {
                throw {
                    line: line || 1,
                    message: `❌ שגיאת גישה: ${memberDescription} מוגדר כ-protected במחלקה '${targetObj.className}' ואינו נגיש מחוץ למחלקה.`
                };
            }
        }
        return true;
    }

    executePropertyGetter(obj, prop, line) {
        const getterScope = new Map();
        getterScope.set('this', obj);
        this.callStack.push({
            funcName: `${obj.className}.${prop.name} (get)`,
            line: line,
            scope: getterScope
        });
        this.recordFrame(line, `קריאה ל-get של המאפיין ${obj.className}.${prop.name}`);
        let result = 0;
        if (prop.getter && prop.getter.body) {
            for (const stmt of prop.getter.body) {
                const ret = this.executeStatement(stmt, getterScope);
                if (ret !== undefined) {
                    result = ret;
                    break;
                }
            }
        }
        this.callStack.pop();
        this.recordFrame(line, `חזרה מ-get של ${obj.className}.${prop.name} עם ערך: ${this.formatVal(result)}`);
        return result;
    }

    executePropertySetter(obj, prop, val, line) {
        const setterScope = new Map();
        setterScope.set('this', obj);
        setterScope.set('value', val); // ב-C# המשתנה value מועבר אוטומטית ל-set
        this.callStack.push({
            funcName: `${obj.className}.${prop.name} (set)`,
            line: line,
            scope: setterScope
        });
        this.recordFrame(line, `קריאה ל-set של המאפיין ${obj.className}.${prop.name} עם value=${this.formatVal(val)}`);
        if (prop.setter && prop.setter.body) {
            for (const stmt of prop.setter.body) {
                const ret = this.executeStatement(stmt, setterScope);
                if (ret !== undefined) break;
            }
        }
        this.callStack.pop();
        this.recordFrame(line, `סיום set של ${obj.className}.${prop.name}`);
    }

    evaluateExpression(expr, scope) {
        if (!expr) return null;

        switch (expr.type) {
            case 'Literal':
                return expr.value;

            case 'ThisExpression': {
                if (scope.has('this')) {
                    return scope.get('this');
                }
                throw { line: expr.line, message: 'השימוש במילת המפתח this מותר רק בתוך בנאי או פעולה של מחלקה' };
            }

            case 'Identifier': {
                if (scope.has(expr.name)) {
                    return scope.get(expr.name);
                }
                if (scope.has('this')) {
                    const thisObj = scope.get('this');
                    if (thisObj instanceof ClassInstance) {
                        if (thisObj.properties && thisObj.properties.has(expr.name)) {
                            const prop = thisObj.properties.get(expr.name);
                            if (prop.getter && prop.getter.isAuto) return thisObj.fields[expr.name] !== undefined ? thisObj.fields[expr.name] : 0;
                            return this.executePropertyGetter(thisObj, prop, expr.line);
                        }
                        if (expr.name in thisObj.fields) {
                            return thisObj.fields[expr.name];
                        }
                    }
                }
                if (this.queues.has(expr.name)) {
                    return this.queues.get(expr.name);
                }
                // ערך ברירת מחדל
                return 0;
            }

            case 'MemberExpression': {
                const obj = this.evaluateExpression(expr.object, scope);
                if (!obj) {
                    throw { line: expr.line, message: `גישה לשדה '${expr.property}' של אובייקט לא מאותחל (null)` };
                }
                if (obj instanceof ClassInstance) {
                    // מאפיין (Property)
                    if (obj.properties && obj.properties.has(expr.property)) {
                        const prop = obj.properties.get(expr.property);
                        if (!prop.getter) {
                            throw { line: expr.line, message: `❌ שגיאת גישה: למאפיין '${expr.property}' במחלקה '${obj.className}' אין פעולת get (Write-Only).` };
                        }
                        this.checkAccess(obj, prop.getter.access || prop.access, scope, `המאפיין '${obj.className}.${expr.property}' (get)`, expr.line);
                        if (prop.getter.isAuto) {
                            return obj.fields[expr.property] !== undefined ? obj.fields[expr.property] : 0;
                        } else {
                            return this.executePropertyGetter(obj, prop, expr.line);
                        }
                    }

                    // שדה רגיל (Field)
                    if (obj.fieldMeta && obj.fieldMeta.has(expr.property)) {
                        const meta = obj.fieldMeta.get(expr.property);
                        this.checkAccess(obj, meta.access || 'private', scope, `השדה '${obj.className}.${expr.property}'`, expr.line);
                        return obj.fields[expr.property] !== undefined ? obj.fields[expr.property] : 0;
                    }

                    return obj.fields[expr.property] !== undefined ? obj.fields[expr.property] : 0;
                }
                if (obj instanceof QueueInstance) {
                    if (expr.property === 'Count' || expr.property === 'Length') {
                        return obj.items.length;
                    }
                }
                return obj[expr.property];
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
                let targetObj = null;
                let targetProp = null;

                if (expr.left.type === 'Identifier') {
                    targetName = expr.left.name;
                } else if (expr.left.type === 'MemberExpression') {
                    targetObj = this.evaluateExpression(expr.left.object, scope);
                    targetProp = expr.left.property;
                    if (!targetObj) {
                        throw { line: expr.line, message: `גישה לשדה '${targetProp}' של אובייקט לא מאותחל (null)` };
                    }
                } else {
                    throw { line: expr.line, message: 'השמה מותרת רק למשתנה או לשדה של אובייקט' };
                }

                const rightVal = this.evaluateExpression(expr.right, scope);

                if (targetName) {
                    if (scope.has(targetName)) {
                        let currentVal = scope.get(targetName);
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

                    if (scope.has('this')) {
                        const thisObj = scope.get('this');
                        if (thisObj instanceof ClassInstance) {
                            if (thisObj.properties && thisObj.properties.has(targetName)) {
                                const prop = thisObj.properties.get(targetName);
                                if (!prop.setter) {
                                    throw { line: expr.line, message: `❌ שגיאת גישה: המאפיין '${targetName}' במחלקה '${thisObj.className}' הוא לקריאה בלבד.` };
                                }
                                let currentVal = (prop.getter && prop.getter.isAuto) ? (thisObj.fields[targetName] || 0) : (prop.getter ? this.executePropertyGetter(thisObj, prop, expr.line) : 0);
                                let finalVal = rightVal;
                                if (expr.operator === '+=') finalVal = currentVal + rightVal;
                                else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                                else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                                else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                                if (prop.setter.isAuto) thisObj.fields[targetName] = finalVal;
                                else this.executePropertySetter(thisObj, prop, finalVal, expr.line);
                                return finalVal;
                            }
                            if (targetName in thisObj.fields) {
                                let currentVal = thisObj.fields[targetName] || 0;
                                let finalVal = rightVal;
                                if (expr.operator === '+=') finalVal = currentVal + rightVal;
                                else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                                else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                                else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                                thisObj.fields[targetName] = finalVal;
                                this.recordFrame(expr.line, `השמה לשדה: ${targetName} = ${this.formatVal(finalVal)}`);
                                return finalVal;
                            }
                        }
                    }

                    let currentVal = 0;
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
                } else if (targetObj && targetProp) {
                    if (targetObj instanceof ClassInstance) {
                        // מאפיין (Property)
                        if (targetObj.properties && targetObj.properties.has(targetProp)) {
                            const prop = targetObj.properties.get(targetProp);
                            if (!prop.setter) {
                                throw {
                                    line: expr.line,
                                    message: `❌ שגיאת גישה: המאפיין '${targetProp}' במחלקה '${targetObj.className}' הוא לקריאה בלבד (Read-Only) ואין לו פעולת set.`
                                };
                            }
                            this.checkAccess(targetObj, prop.setter.access || prop.access, scope, `המאפיין '${targetObj.className}.${targetProp}' (set)`, expr.line);
                            let currentVal = (prop.getter && prop.getter.isAuto) ? (targetObj.fields[targetProp] || 0) : (prop.getter ? this.executePropertyGetter(targetObj, prop, expr.line) : 0);
                            let finalVal = rightVal;
                            if (expr.operator === '+=') finalVal = currentVal + rightVal;
                            else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                            else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                            else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                            if (prop.setter.isAuto) {
                                targetObj.fields[targetProp] = finalVal;
                            } else {
                                this.executePropertySetter(targetObj, prop, finalVal, expr.line);
                            }
                            this.recordFrame(expr.line, `השמה למאפיין: ${targetObj.className}.${targetProp} = ${this.formatVal(finalVal)}`);
                            return finalVal;
                        }

                        // שדה רגיל (Field)
                        if (targetObj.fieldMeta && targetObj.fieldMeta.has(targetProp)) {
                            const meta = targetObj.fieldMeta.get(targetProp);
                            this.checkAccess(targetObj, meta.access || 'private', scope, `השדה '${targetObj.className}.${targetProp}'`, expr.line);
                        }

                        let currentVal = (targetObj.fields && targetObj.fields[targetProp] !== undefined) ? targetObj.fields[targetProp] : 0;
                        let finalVal = rightVal;
                        if (expr.operator === '+=') finalVal = currentVal + rightVal;
                        else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                        else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                        else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                        targetObj.fields[targetProp] = finalVal;
                        this.recordFrame(expr.line, `השמה לשדה: ${targetProp} = ${this.formatVal(finalVal)}`);
                        return finalVal;
                    } else {
                        let currentVal = targetObj[targetProp] !== undefined ? targetObj[targetProp] : 0;
                        let finalVal = rightVal;
                        if (expr.operator === '+=') finalVal = currentVal + rightVal;
                        else if (expr.operator === '-=') finalVal = currentVal - rightVal;
                        else if (expr.operator === '*=') finalVal = currentVal * rightVal;
                        else if (expr.operator === '/=') finalVal = rightVal !== 0 ? Math.trunc(currentVal / rightVal) : 0;

                        targetObj[targetProp] = finalVal;
                        this.recordFrame(expr.line, `השמה לשדה: ${targetProp} = ${this.formatVal(finalVal)}`);
                        return finalVal;
                    }
                }
                break;
            }

            case 'UpdateExpression': {
                if (expr.argument.type === 'Identifier') {
                    const varName = expr.argument.name;
                    let currentVal = scope.has(varName) ? scope.get(varName) : 0;
                    if (expr.operator === '++') currentVal++;
                    else if (expr.operator === '--') currentVal--;
                    scope.set(varName, currentVal);
                    this.recordFrame(expr.line, `קידום משתנה: ${varName} הפך ל-${currentVal}`);
                    return currentVal;
                } else if (expr.argument.type === 'MemberExpression') {
                    const targetObj = this.evaluateExpression(expr.argument.object, scope);
                    const prop = expr.argument.property;
                    if (targetObj instanceof ClassInstance) {
                        let currentVal = 0;
                        if (targetObj.properties && targetObj.properties.has(prop)) {
                            const p = targetObj.properties.get(prop);
                            this.checkAccess(targetObj, p.getter ? (p.getter.access || p.access) : p.access, scope, `המאפיין '${targetObj.className}.${prop}' (get)`, expr.line);
                            currentVal = (p.getter && p.getter.isAuto) ? (targetObj.fields[prop] || 0) : this.executePropertyGetter(targetObj, p, expr.line);
                            const updatedVal = expr.operator === '++' ? currentVal + 1 : currentVal - 1;
                            this.checkAccess(targetObj, p.setter ? (p.setter.access || p.access) : p.access, scope, `המאפיין '${targetObj.className}.${prop}' (set)`, expr.line);
                            if (p.setter && p.setter.isAuto) targetObj.fields[prop] = updatedVal;
                            else if (p.setter) this.executePropertySetter(targetObj, p, updatedVal, expr.line);
                            this.recordFrame(expr.line, `קידום מאפיין: ${prop} הפך ל-${updatedVal}`);
                            return updatedVal;
                        } else {
                            if (targetObj.fieldMeta && targetObj.fieldMeta.has(prop)) {
                                const meta = targetObj.fieldMeta.get(prop);
                                this.checkAccess(targetObj, meta.access || 'private', scope, `השדה '${targetObj.className}.${prop}'`, expr.line);
                            }
                            currentVal = (targetObj.fields && targetObj.fields[prop] !== undefined) ? targetObj.fields[prop] : 0;
                            const updatedVal = expr.operator === '++' ? currentVal + 1 : currentVal - 1;
                            targetObj.fields[prop] = updatedVal;
                            this.recordFrame(expr.line, `קידום שדה: ${prop} הפך ל-${updatedVal}`);
                            return updatedVal;
                        }
                    }
                }
                break;
            }

            case 'NewExpression': {
                if (expr.className.startsWith('Queue')) {
                    let innerType = 'int';
                    const qMatch = expr.className.match(/^Queue<(.+)>$/);
                    if (qMatch) {
                        innerType = qMatch[1].trim();
                    }
                    const newQ = new QueueInstance('temp_' + (this.queues.size + 1), [], innerType);
                    return newQ;
                }

                if (this.classes.has(expr.className)) {
                    const classDecl = this.classes.get(expr.className);
                    const fieldMeta = new Map();
                    const propMeta = new Map();

                    for (const f of classDecl.fields) {
                        fieldMeta.set(f.name, { access: f.access || 'private', type: f.type });
                    }

                    if (classDecl.properties) {
                        for (const p of classDecl.properties) {
                            propMeta.set(p.name, p);
                        }
                    }

                    const instance = new ClassInstance(classDecl.name, {}, fieldMeta, propMeta);

                    for (const f of classDecl.fields) {
                        let defaultVal = 0;
                        if (f.type === 'string') defaultVal = '';
                        else if (f.type === 'bool') defaultVal = false;
                        else if (f.type === 'char') defaultVal = ' ';
                        else if (f.type.startsWith('Queue')) defaultVal = null;
                        if (f.init) {
                            defaultVal = this.evaluateExpression(f.init, new Map());
                        }
                        instance.fields[f.name] = defaultVal;
                    }

                    if (classDecl.properties) {
                        for (const p of classDecl.properties) {
                            if (p.getter && p.getter.isAuto) {
                                let defaultVal = 0;
                                if (p.type === 'string') defaultVal = '';
                                else if (p.type === 'bool') defaultVal = false;
                                else if (p.type === 'char') defaultVal = ' ';
                                else if (p.type.startsWith('Queue')) defaultVal = null;
                                if (p.init) {
                                    defaultVal = this.evaluateExpression(p.init, new Map());
                                }
                                instance.fields[p.name] = defaultVal;
                            }
                        }
                    }

                    for (const m of classDecl.methods) {
                        instance.methods.set(m.name, m);
                    }

                    const evalArgs = (expr.arguments || []).map(arg => this.evaluateExpression(arg, scope));
                    let ctor = null;
                    if (classDecl.constructors && classDecl.constructors.length > 0) {
                        ctor = classDecl.constructors.find(c => c.params.length === evalArgs.length) || classDecl.constructors[0];
                    }

                    if (ctor) {
                        this.checkAccess(instance, ctor.access || 'public', scope, `הבנאי של '${classDecl.name}'`, expr.line);
                        const ctorScope = new Map();
                        ctorScope.set('this', instance);
                        ctor.params.forEach((param, idx) => {
                            ctorScope.set(param.name, evalArgs[idx] !== undefined ? evalArgs[idx] : 0);
                        });
                        this.callStack.push({
                            funcName: `${classDecl.name} (בנאי Constructor)`,
                            line: expr.line,
                            scope: ctorScope
                        });
                        this.recordFrame(expr.line, `קריאה לבנאי new ${classDecl.name}(${evalArgs.map(v => this.formatVal(v)).join(', ')})`);

                        for (const stmt of ctor.body) {
                            const ret = this.executeStatement(stmt, ctorScope);
                            if (ret !== undefined) break;
                        }
                        this.callStack.pop();
                        this.recordFrame(expr.line, `סיום בנאי ${classDecl.name} ויצירת מופע חדש: ${this.formatVal(instance)}`);
                    } else {
                        this.recordFrame(expr.line, `יצירת מופע של ${classDecl.name}`);
                    }

                    return instance;
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

                // תמיכה במתודות של ClassInstance
                if (obj instanceof ClassInstance) {
                    if (expr.method === 'ToString') {
                        if (obj.methods.has('ToString')) {
                            const methodDecl = obj.methods.get('ToString');
                            this.checkAccess(obj, methodDecl.access || 'public', scope, `הפעולה '${obj.className}.ToString()'`, expr.line);
                            const mScope = new Map();
                            mScope.set('this', obj);
                            this.callStack.push({
                                funcName: `${obj.className}.ToString()`,
                                line: expr.line,
                                scope: mScope
                            });
                            let res = null;
                            for (const stmt of methodDecl.body) {
                                const ret = this.executeStatement(stmt, mScope);
                                if (ret !== undefined) {
                                    res = ret;
                                    break;
                                }
                            }
                            this.callStack.pop();
                            return res !== null ? String(res) : obj.toString();
                        }
                        return obj.toString();
                    }

                    if (obj.methods.has(expr.method)) {
                        const methodDecl = obj.methods.get(expr.method);
                        this.checkAccess(obj, methodDecl.access || 'public', scope, `הפעולה '${obj.className}.${expr.method}()'`, expr.line);
                        const evalArgs = (expr.arguments || []).map(arg => this.evaluateExpression(arg, scope));
                        const methodScope = new Map();
                        methodScope.set('this', obj);
                        methodDecl.params.forEach((param, idx) => {
                            methodScope.set(param.name, evalArgs[idx] !== undefined ? evalArgs[idx] : 0);
                        });
                        this.callStack.push({
                            funcName: `${obj.className}.${expr.method}()`,
                            line: expr.line,
                            scope: methodScope
                        });
                        this.recordFrame(expr.line, `קריאה לפעולה ${obj.className}.${expr.method}(${evalArgs.map(v => this.formatVal(v)).join(', ')})`);
                        let res = undefined;
                        for (const stmt of methodDecl.body) {
                            const ret = this.executeStatement(stmt, methodScope);
                            if (ret !== undefined) {
                                res = ret;
                                break;
                            }
                        }
                        this.callStack.pop();
                        this.recordFrame(expr.line, `חזרה מפעולת ${obj.className}.${expr.method}`);
                        return res;
                    }
                }

                // תמיכה ב-ToString() גנרי
                if (expr.method === 'ToString') {
                    return this.formatVal(obj);
                }

                if (obj instanceof QueueInstance) {
                    const methodName = expr.method;
                    if (methodName === 'Insert') {
                        const insertVal = this.evaluateExpression(expr.arguments[0], scope);
                        obj.insert(insertVal);
                        this.recordFrame(expr.line, `פעולת ${obj.name}.Insert(${this.formatVal(insertVal)}): הכנסת ${this.formatVal(insertVal)} לסוף התור`, 'insert', false, null, obj.name, insertVal);
                        return null;
                    } else if (methodName === 'Remove') {
                        try {
                            const removedVal = obj.remove();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Remove(): הוצאת ${this.formatVal(removedVal)} מראש התור`, 'remove', false, null, obj.name, removedVal);
                            return removedVal;
                        } catch (err) {
                            throw { line: expr.line, message: err.message };
                        }
                    } else if (methodName === 'Head') {
                        try {
                            const headVal = obj.head();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Head(): הצצה בראש התור (${this.formatVal(headVal)}) ללא שינוי`, 'head', false, null, obj.name, headVal);
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
                throw { line: expr.line, message: `${targetObjName} אינו תור או אובייקט מאותחל` };
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

    snapshotItems(items) {
        return items.map(item => {
            if (item instanceof QueueInstance) {
                return {
                    isQueue: true,
                    name: item.name,
                    itemType: item.itemType || 'int',
                    items: this.snapshotItems(item.items)
                };
            }
            if (item instanceof ClassInstance) {
                const snapFields = {};
                const snapMeta = {};
                for (const [k, v] of Object.entries(item.fields)) {
                    if (v instanceof QueueInstance) {
                        snapFields[k] = `Queue [${v.items.length}]`;
                    } else if (v instanceof ClassInstance) {
                        snapFields[k] = v.className;
                    } else {
                        snapFields[k] = v;
                    }
                    if (item.fieldMeta && item.fieldMeta.has(k)) {
                        snapMeta[k] = item.fieldMeta.get(k).access;
                    } else if (item.properties && item.properties.has(k)) {
                        snapMeta[k] = item.properties.get(k).access;
                    } else {
                        snapMeta[k] = 'public';
                    }
                }
                return {
                    isClass: true,
                    className: item.className,
                    fields: snapFields,
                    fieldAccess: snapMeta,
                    toStringVal: this.formatVal(item)
                };
            }
            if (item && typeof item === 'object' && item.isQueue) {
                return {
                    isQueue: true,
                    name: item.name,
                    itemType: item.itemType || 'int',
                    items: this.snapshotItems(item.items)
                };
            }
            if (item && typeof item === 'object' && item.isClass) {
                return { ...item, fields: { ...item.fields } };
            }
            return item;
        });
    }

    recordFrame(line, description, opType = 'idle', isCompleted = false, originalPreserved = null, targetQueueName = null, targetValue = null) {
        this.stepCount++;

        // שכפול מצב התורים כולל אובייקטים ותורים מקוננים (Deep Snapshotting)
        const queuesSnapshot = [];
        this.queues.forEach((qInst, qName) => {
            queuesSnapshot.push({
                name: qName,
                id: qInst.id,
                itemType: qInst.itemType || 'int',
                items: this.snapshotItems(qInst.items),
                lastOp: (targetQueueName === qName) ? opType : 'none',
                targetVal: (targetQueueName === qName) ? (targetValue instanceof ClassInstance ? targetValue.clone() : (targetValue instanceof QueueInstance ? targetValue.clone() : targetValue)) : null
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
            return `Queue [${val.items.map(it => this.formatVal(it)).join(', ')}]`;
        }
        if (val instanceof ClassInstance) {
            if (val.methods && val.methods.has('ToString')) {
                try {
                    const methodDecl = val.methods.get('ToString');
                    const mScope = new Map();
                    mScope.set('this', val);
                    for (const stmt of methodDecl.body) {
                        if (stmt.type === 'ReturnStatement' && stmt.value) {
                            return String(this.evaluateExpression(stmt.value, mScope));
                        }
                    }
                } catch (e) {}
            }
            return val.toString();
        }
        if (val && typeof val === 'object' && val.isQueue) {
            return `Queue [${val.items.map(it => this.formatVal(it)).join(', ')}]`;
        }
        if (val && typeof val === 'object' && val.isClass) {
            if (val.toStringVal) return val.toStringVal;
            const fieldStrs = Object.entries(val.fields).map(([k, v]) => `${k}: ${this.formatVal(v)}`);
            return `${val.className} { ${fieldStrs.join(', ')} }`;
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
    window.QueueInstance = QueueInstance;
    window.ClassInstance = ClassInstance;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSharpQueueInterpreter, QueueInstance, ClassInstance, RuntimeEnvironment };
}
