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
            const errorFile = err.file || (runtime ? runtime.currentFile : 'Program.cs') || 'Program.cs';
            const existingFrames = (runtime && runtime.frames && runtime.frames.length > 0) ? runtime.frames : [];
            const lastFrame = existingFrames.length > 0 ? existingFrames[existingFrames.length - 1] : null;

            existingFrames.push({
                step: existingFrames.length,
                line: errorLine,
                file: errorFile,
                description: `❌ שגיאת ריצה: ${err.message}`,
                callStack: lastFrame ? lastFrame.callStack : [{ funcName: 'שגיאה', line: errorLine, file: errorFile, variables: {} }],
                queues: lastFrame ? lastFrame.queues : [{ name: 'q', items: [...(Array.isArray(initialQueueValues) ? initialQueueValues : (initialQueueValues && initialQueueValues.q ? initialQueueValues.q : []))], op: 'none' }],
                stacks: lastFrame ? lastFrame.stacks : [],
                variables: lastFrame ? lastFrame.variables : {},
                consoleOutputs: lastFrame && lastFrame.consoleOutputs ? [...lastFrame.consoleOutputs] : [],
                error: err.message,
                isCompleted: true,
                originalPreserved: false
            });

            const entryFunc = (this.ast && this.ast.functions) ? (this.ast.functions.find(f => f.name === 'Main') || this.ast.functions[0]) : null;
            const fallbackParams = entryFunc ? entryFunc.params.map(p => ({
                name: p.name,
                type: p.type,
                isQueue: p.type.startsWith('Queue'),
                queueItemType: p.type.startsWith('Queue') ? (p.type.match(/^Queue<(.+)>$/) ? p.type.match(/^Queue<(.+)>$/)[1].trim() : 'int') : null,
                isStack: p.type.startsWith('Stack'),
                stackItemType: p.type.startsWith('Stack') ? (p.type.match(/^Stack<(.+)>$/) ? p.type.match(/^Stack<(.+)>$/)[1].trim() : 'int') : null,
                isNode: p.type.startsWith('Node'),
                nodeItemType: p.type.startsWith('Node') ? (p.type.match(/^Node<(.+)>$/) ? p.type.match(/^Node<(.+)>$/)[1].trim() : 'int') : null,
                isBinNode: p.type.startsWith('BinNode'),
                binNodeItemType: p.type.startsWith('BinNode') ? (p.type.match(/^BinNode<(.+)>$/) ? p.type.match(/^BinNode<(.+)>$/)[1].trim() : 'int') : null
            })) : [];

            return {
                frames: existingFrames,
                error: err.message,
                errorFile,
                params: fallbackParams,
                originalPreserved: false
            };
        }
    }

    /**
     * חלוקה לטוקנים תוך שמירה על מספרי שורות מקוריים
     */
    preprocess(code) {
        let fileList = [];
        if (typeof code === 'string') {
            fileList.push({ fileName: 'Program.cs', code: code });
        } else if (Array.isArray(code)) {
            fileList = code;
        } else if (code && typeof code === 'object') {
            for (const [name, content] of Object.entries(code)) {
                fileList.push({ fileName: name, code: content });
            }
        }

        const lineMap = []; // index -> originalLineNumber
        const tokens = [];

        for (const fileObj of fileList) {
            const fileName = fileObj.fileName || 'Program.cs';
            const rawLines = (fileObj.code || '').split(/\r?\n/);
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
                const lineTokens = this.tokenizeLine(line, originalLineNum, fileName);
                tokens.push(...lineTokens);
            }
        }

        return { tokens, lineMap };
    }

    tokenizeLine(line, lineNum, fileName = 'Program.cs') {
        const tokens = [];
        const regex = /\s*(==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>|[(){}\[\],;+\-*\/%<>=!.]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'|[a-zA-Z_]\w*(?:<[a-zA-Z0-9_,\s]*(?:<[a-zA-Z0-9_,\s]*(?:<[a-zA-Z0-9_,\s]*>)?>)?>)?|-?\d+(?:\.\d+)?)\s*/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const val = match[1];
            tokens.push({
                value: val,
                line: lineNum,
                file: fileName
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
        return this.tokens[this.pos + offset] || { value: '', line: -1, file: 'Program.cs' };
    }

    consume() {
        return this.tokens[this.pos++] || { value: '', line: -1, file: 'Program.cs' };
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
                file: current.file || 'Program.cs',
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
                    line: classTok.line,
                    file: classTok.file || 'Program.cs'
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
                            getter = { isAuto: false, access: acc, body: [{ type: 'ReturnStatement', argument: expr, line: classTok.line, file: classTok.file || 'Program.cs' }] };
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
                            setter = { isAuto: false, access: acc, body: [{ type: 'ExpressionStatement', expression: expr, line: classTok.line, file: classTok.file || 'Program.cs' }] };
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
                    line: classTok.line,
                    file: classTok.file || 'Program.cs'
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
                    getter: { isAuto: false, access, body: [{ type: 'ReturnStatement', argument: expr, line: classTok.line, file: classTok.file || 'Program.cs' }] },
                    setter: null,
                    init: null,
                    line: classTok.line,
                    file: classTok.file || 'Program.cs'
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
                    line: classTok.line,
                    file: classTok.file || 'Program.cs'
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
                    fields.push({ name: fn, type: memberType, access, init, line: classTok.line, file: classTok.file || 'Program.cs' });
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
            line: classTok.line,
            file: classTok.file || 'Program.cs'
        };
    }

    isFunctionStart() {
        let i = 0;
        let tok = this.peek(i);
        while (['public', 'private', 'protected', 'static', 'override', 'virtual', 'void', 'int', 'char', 'bool', 'double', 'string', 'var'].includes(tok.value) ||
               tok.value.startsWith('Queue<') || tok.value.startsWith('Queue') ||
               tok.value.startsWith('Stack<') || tok.value.startsWith('Stack') ||
               tok.value.startsWith('Node<') || tok.value.startsWith('Node') ||
               tok.value.startsWith('BinNode<') || tok.value.startsWith('BinNode') ||
               (this.knownClasses && this.knownClasses.has(tok.value))) {
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
            line: startTok.line,
            file: startTok.file || 'Program.cs'
        };
    }

    parseStatement() {
        const tok = this.peek();
        const file = tok.file || 'Program.cs';

        // בלוק { ... }
        if (tok.value === '{') {
            this.consume();
            const statements = [];
            while (this.peek().value !== '}' && this.pos < this.tokens.length) {
                statements.push(this.parseStatement());
            }
            this.expect('}');
            return { type: 'BlockStatement', statements, line: tok.line, file };
        }

        // while (...)
        if (tok.value === 'while') {
            this.consume();
            this.expect('(');
            const condition = this.parseExpression();
            this.expect(')');
            const body = this.parseStatement();
            return { type: 'WhileStatement', condition, body, line: tok.line, file };
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
            return { type: 'IfStatement', condition, consequent, alternate, line: tok.line, file };
        }

        // return ...;
        if (tok.value === 'return') {
            this.consume();
            let value = null;
            if (this.peek().value !== ';') {
                value = this.parseExpression();
            }
            this.expect(';');
            return { type: 'ReturnStatement', value, line: tok.line, file };
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
                line: tok.line,
                file
            };
        }

        // השמה או קריאה לפעולה: x = 10;, count++; q.Insert(x);
        const expr = this.parseExpression();
        this.expect(';');
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: tok.line,
            file
        };
    }

    isType(val) {
        if (!val) return false;
        if (['int', 'char', 'double', 'bool', 'string', 'void', 'var'].includes(val)) return true;
        if (val.startsWith('Queue') || val.startsWith('Stack') || val.startsWith('Node') || val.startsWith('BinNode')) return true;
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
                file: tok.file || 'Program.cs',
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

        // null
        if (tok.value === 'null') {
            this.consume();
            return { type: 'Literal', value: null, raw: 'null', line: tok.line };
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
 * מודל המחסנית (Stack) לפי תקן משרד החינוך
 */
class StackInstance {
    constructor(name, initialItems = [], itemType = 'int') {
        this.id = 'st_' + Math.random().toString(36).substring(2, 9);
        this.name = name;
        this.itemType = itemType;
        // אינדקס 0 = תחתית המחסנית (Bottom), אינדקס length-1 = ראש המחסנית (Top)
        this.items = [...initialItems];
        this.lastOp = 'none';
        this.targetVal = null;
    }

    push(val) {
        this.items.push(val);
        this.lastOp = 'push';
        this.targetVal = val;
    }

    pop() {
        if (this.isEmpty()) {
            throw new Error(`StackEmptyException: ניסיון לשלוף איבר (Pop) מתוך מחסנית '${this.name}' כשהיא ריקה!`);
        }
        const val = this.items.pop();
        this.lastOp = 'pop';
        this.targetVal = val;
        return val;
    }

    top() {
        if (this.isEmpty()) {
            throw new Error(`StackEmptyException: ניסיון להציץ בראש המחסנית (Top) במחסנית '${this.name}' כשהיא ריקה!`);
        }
        this.lastOp = 'top';
        this.targetVal = this.items[this.items.length - 1];
        return this.targetVal;
    }

    isEmpty() {
        return this.items.length === 0;
    }

    clone(newName) {
        const clonedItems = this.items.map(it => {
            if (it instanceof QueueInstance || it instanceof StackInstance || it instanceof ClassInstance) return it.clone();
            return it;
        });
        const copy = new StackInstance(newName || this.name, clonedItems, this.itemType);
        copy.id = this.id;
        return copy;
    }

    toString() {
        return `[Bottom -> ${this.items.join(', ')} -> Top]`;
    }
}

/**
 * מודל מופע חוליה (Node<T>) לפי תקן משרד החינוך
 */
class NodeInstance {
    constructor(info, next = null) {
        this.info = info;
        this.next = next;
    }

    getInfo() { return this.info; }
    GetInfo() { return this.info; }
    setInfo(v) { this.info = v; }
    SetInfo(v) { this.info = v; }
    getNext() { return this.next; }
    GetNext() { return this.next; }
    setNext(n) { this.next = n; }
    SetNext(n) { this.next = n; }
    hasNext() { return this.next !== null; }
    HasNext() { return this.next !== null; }

    clone() {
        return new NodeInstance(this.info, this.next ? this.next.clone() : null);
    }

    toString() {
        const items = [];
        let curr = this;
        let count = 0;
        while (curr && count < 50) {
            items.push(curr.info);
            curr = curr.next;
            count++;
        }
        return items.join(' -> ') + ' -> null';
    }
    ToString() { return this.toString(); }
}

function buildNodeChain(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    let head = null;
    let tail = null;
    for (const v of arr) {
        const n = new NodeInstance(v, null);
        if (!head) { head = n; tail = n; }
        else { tail.next = n; tail = n; }
    }
    return head;
}

/**
 * מודל מופע עץ בינארי (BinNode<T>) לפי תקן משרד החינוך
 */
class BinNodeInstance {
    constructor(value, left = null, right = null) {
        this.value = value;
        this.left = left;
        this.right = right;
    }

    getValue() { return this.value; }
    GetValue() { return this.value; }
    setValue(v) { this.value = v; }
    SetValue(v) { this.value = v; }
    getLeft() { return this.left; }
    GetLeft() { return this.left; }
    setLeft(l) { this.left = l; }
    SetLeft(l) { this.left = l; }
    getRight() { return this.right; }
    GetRight() { return this.right; }
    setRight(r) { this.right = r; }
    SetRight(r) { this.right = r; }
    hasLeft() { return this.left !== null; }
    HasLeft() { return this.left !== null; }
    hasRight() { return this.right !== null; }
    HasRight() { return this.right !== null; }
    isLeaf() { return this.left === null && this.right === null; }
    IsLeaf() { return this.left === null && this.right === null; }

    clone() {
        return new BinNodeInstance(this.value, this.left ? this.left.clone() : null, this.right ? this.right.clone() : null);
    }

    toString() { return String(this.value); }
    ToString() { return String(this.value); }
}

function normalizeBinTreePath(rawPath) {
    if (!rawPath) return '';
    let p = String(rawPath).trim().toUpperCase();
    if (p === 'ROOT' || p === 'שורש') return '';
    p = p.replace(/ש/g, 'L').replace(/י/g, 'R');
    return p.replace(/[^LR]/g, '');
}

function parseBinNodeVal(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === '' || s === '-' || s === 'null' || s === 'None' || s === 'ריק' || s === 'אין') return null;
    const num = Number(s);
    if (!isNaN(num) && s !== '') return Math.trunc(num);
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
        return s.slice(1, -1);
    }
    return s;
}

function parseBinTreeInput(input) {
    if (input === null || input === undefined) return null;
    if (input instanceof BinNodeInstance) return input;

    // If already structured object with left/right or value
    if (typeof input === 'object' && !Array.isArray(input)) {
        if ('value' in input || 'val' in input) {
            const val = input.value !== undefined ? input.value : input.val;
            return new BinNodeInstance(val, parseBinTreeInput(input.left), parseBinTreeInput(input.right));
        }
        // Path dictionary: { 'root': 10, 'L': 5, 'R': 20, 'LR': 8 }
        return buildFromPathMap(input);
    }

    let str = '';
    if (Array.isArray(input)) {
        // If array of path strings: ['root: 10', 'L: 5']
        if (input.length > 0 && typeof input[0] === 'string' && (input[0].includes(':') || input[0].includes('='))) {
            str = input.join(', ');
        } else {
            // Standard array: [10, 5, 20, null, 8]
            return buildFromLevelArray(input);
        }
    } else {
        str = String(input).trim();
    }

    if (!str) return null;

    // Check if contains path syntax: 'root:', 'L:', 'R:', 'ש:', 'י:', 'שורש:' or '='
    const hasPathSyntax = /(?:^|[\s,;])(root|שורש|[LRשילר]+)\s*[:=]/iu.test(str);
    if (hasPathSyntax) {
        return buildFromPathString(str);
    }

    // Check if contains edge syntax: '10: 5, 20' or '10 -> 5, 20'
    const hasEdgeSyntax = /(-?\d+|'[^']+'|"[^"]+")\s*(?:->|:)\s*(-?\d+|null|-|'[^']+'|"[^"]+")/i.test(str);
    if (hasEdgeSyntax && (str.includes(';') || str.includes('\n') || str.includes('->') || (str.match(/:/g) || []).length > 1)) {
        return buildFromEdgeString(str);
    }

    // Check if contains nested parentheses: '10(5, 20)' or '10(5(3, 7), 20)'
    if (/^[^()]+\(.*\)$/.test(str)) {
        return buildFromParenthesesString(str);
    }

    // Otherwise fallback to comma-separated list (level-order BFS)
    const items = str.split(',').map(s => s.trim());
    return buildFromLevelArray(items);
}

function buildBinTree(input) {
    return parseBinTreeInput(input);
}

function buildFromPathString(str) {
    const map = {};
    const tokens = str.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    let rootValueExplicit = null;

    tokens.forEach((tok, idx) => {
        const m = tok.match(/^([a-zA-Z\u0590-\u05FF]+)\s*[:=]\s*(.+)$/u);
        if (m) {
            const p = normalizeBinTreePath(m[1]);
            const v = parseBinNodeVal(m[2]);
            if (p === '') rootValueExplicit = v;
            map[p] = v;
        } else {
            const val = parseBinNodeVal(tok);
            if (idx === 0 && val !== null && !tok.includes(':')) {
                map[''] = val;
                rootValueExplicit = val;
            }
        }
    });

    return buildFromPathMap(map, rootValueExplicit);
}

function buildFromPathMap(map, fallbackRootVal = 0) {
    const paths = Object.keys(map).sort((a, b) => a.length - b.length);
    if (paths.length === 0) return null;

    const rootVal = map[''] !== undefined ? map[''] : (fallbackRootVal !== null ? fallbackRootVal : map[paths[0]]);
    const root = new BinNodeInstance(rootVal);

    paths.forEach(p => {
        if (p === '') return;
        const val = map[p];
        if (val === null) return;

        let curr = root;
        for (let i = 0; i < p.length; i++) {
            const dir = p[i];
            const isLast = (i === p.length - 1);
            if (dir === 'L') {
                if (isLast) {
                    curr.left = new BinNodeInstance(val);
                } else {
                    if (!curr.left) curr.left = new BinNodeInstance(0);
                    curr = curr.left;
                }
            } else if (dir === 'R') {
                if (isLast) {
                    curr.right = new BinNodeInstance(val);
                } else {
                    if (!curr.right) curr.right = new BinNodeInstance(0);
                    curr = curr.right;
                }
            }
        }
    });

    return root;
}

function buildFromEdgeString(str) {
    const segments = str.split(/[;\n]+/).map(s => s.trim()).filter(Boolean);
    const nodeMap = new Map();
    const hasParent = new Set();
    const relations = [];

    const getNode = (val) => {
        if (!nodeMap.has(val)) {
            nodeMap.set(val, new BinNodeInstance(val));
        }
        return nodeMap.get(val);
    };

    segments.forEach(seg => {
        const m = seg.match(/^([^:->]+)\s*(?:->|:)\s*(.*)$/);
        if (m) {
            const pVal = parseBinNodeVal(m[1]);
            const childrenStr = m[2].replace(/[()]/g, '').trim();
            const childParts = childrenStr.split(',').map(s => parseBinNodeVal(s.trim()));
            const leftVal = childParts[0] !== undefined ? childParts[0] : null;
            const rightVal = childParts[1] !== undefined ? childParts[1] : null;
            relations.push({ parent: pVal, left: leftVal, right: rightVal });
            if (leftVal !== null) hasParent.add(leftVal);
            if (rightVal !== null) hasParent.add(rightVal);
        }
    });

    if (relations.length === 0) return null;

    relations.forEach(r => {
        const pNode = getNode(r.parent);
        if (r.left !== null) pNode.left = getNode(r.left);
        if (r.right !== null) pNode.right = getNode(r.right);
    });

    const rootRel = relations.find(r => !hasParent.has(r.parent)) || relations[0];
    return getNode(rootRel.parent);
}

function buildFromParenthesesString(str) {
    let i = 0;
    function parseNode() {
        while (i < str.length && (str[i] === ' ' || str[i] === ',')) i++;
        if (i >= str.length) return null;
        if (str[i] === '-' || str.substr(i, 4) === 'null') {
            if (str[i] === '-') i++; else i += 4;
            return null;
        }

        let valStr = '';
        while (i < str.length && str[i] !== '(' && str[i] !== ')' && str[i] !== ',') {
            valStr += str[i++];
        }
        valStr = valStr.trim();
        if (!valStr) return null;

        const val = parseBinNodeVal(valStr);
        const node = new BinNodeInstance(val);

        if (i < str.length && str[i] === '(') {
            i++;
            node.left = parseNode();
            while (i < str.length && (str[i] === ' ' || str[i] === ',')) i++;
            if (i < str.length && str[i] !== ')') {
                node.right = parseNode();
            }
            while (i < str.length && str[i] !== ')') i++;
            if (i < str.length && str[i] === ')') i++;
        }
        return node;
    }
    return parseNode();
}

function buildFromLevelArray(items) {
    if (!items || items.length === 0) return null;
    const parsed = items.map(it => parseBinNodeVal(it));
    if (parsed.length === 0 || parsed[0] === null) return null;

    const root = new BinNodeInstance(parsed[0]);
    const queue = [root];
    let i = 1;

    while (queue.length > 0 && i < parsed.length) {
        const curr = queue.shift();
        if (!curr) continue;

        if (i < parsed.length) {
            const leftVal = parsed[i++];
            if (leftVal !== null) {
                curr.left = new BinNodeInstance(leftVal);
                queue.push(curr.left);
            }
        }

        if (i < parsed.length) {
            const rightVal = parsed[i++];
            if (rightVal !== null) {
                curr.right = new BinNodeInstance(rightVal);
                queue.push(curr.right);
            }
        }
    }
    return root;
}

function treeToPathMap(root) {
    const map = {};
    if (!root) return map;
    function traverse(node, path) {
        if (!node) return;
        map[path] = node.value;
        if (node.left) traverse(node.left, path + 'L');
        if (node.right) traverse(node.right, path + 'R');
    }
    traverse(root, '');
    return map;
}

function treeToCanonicalString(root) {
    if (!root) return '';
    const map = treeToPathMap(root);
    const keys = Object.keys(map).sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });
    if (keys.length === 0) return '';
    return keys.map(k => (k === '' ? `root: ${map[k]}` : `${k}: ${map[k]}`)).join(', ');
}

function treeToLevels(root) {
    if (!root) return [];
    const levels = [];
    const queue = [{ node: root, path: '', level: 0 }];
    while (queue.length > 0) {
        const item = queue.shift();
        if (!levels[item.level]) levels[item.level] = [];
        levels[item.level].push({
            path: item.path,
            value: item.node.value,
            hasLeft: item.node.left !== null,
            hasRight: item.node.right !== null,
            leftValue: item.node.left ? item.node.left.value : null,
            rightValue: item.node.right ? item.node.right.value : null
        });
        if (item.node.left) queue.push({ node: item.node.left, path: item.path + 'L', level: item.level + 1 });
        if (item.node.right) queue.push({ node: item.node.right, path: item.path + 'R', level: item.level + 1 });
    }
    return levels;
}

function setNodeAtPath(root, path, val) {
    const cleanVal = parseBinNodeVal(val);
    if (!root) {
        return cleanVal !== null ? new BinNodeInstance(cleanVal) : null;
    }
    const cleanPath = normalizeBinTreePath(path);
    if (cleanPath === '') {
        if (cleanVal !== null) root.value = cleanVal;
        return root;
    }
    let curr = root;
    for (let i = 0; i < cleanPath.length; i++) {
        const dir = cleanPath[i];
        const isLast = (i === cleanPath.length - 1);
        if (dir === 'L') {
            if (isLast) {
                if (cleanVal === null) curr.left = null;
                else if (curr.left) curr.left.value = cleanVal;
                else curr.left = new BinNodeInstance(cleanVal);
            } else {
                if (!curr.left) curr.left = new BinNodeInstance(0);
                curr = curr.left;
            }
        } else if (dir === 'R') {
            if (isLast) {
                if (cleanVal === null) curr.right = null;
                else if (curr.right) curr.right.value = cleanVal;
                else curr.right = new BinNodeInstance(cleanVal);
            } else {
                if (!curr.right) curr.right = new BinNodeInstance(0);
                curr = curr.right;
            }
        }
    }
    return root;
}

function removeNodeAtPath(root, path) {
    if (!root) return null;
    const cleanPath = normalizeBinTreePath(path);
    if (cleanPath === '') return null;
    let curr = root;
    for (let i = 0; i < cleanPath.length - 1; i++) {
        const dir = cleanPath[i];
        curr = (dir === 'L') ? curr.left : curr.right;
        if (!curr) return root;
    }
    const lastDir = cleanPath[cleanPath.length - 1];
    if (lastDir === 'L') curr.left = null;
    else if (lastDir === 'R') curr.right = null;
    return root;
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

        // מפת התורים הפעילים
        this.queues = new Map();
        this.hasInitialQueue = false;
        this.initialQueueName = null;
        this.initialQueueSnapshot = [];

        // מפת המחסניות הפעילות (תקן משרד החינוך)
        this.stacks = new Map();
        this.hasInitialStack = false;
        this.initialStackName = null;
        this.initialStackType = 'int';
        this.initialStacksList = [];
        this.initialStacksSnapshotList = [];

        // פונקציות זמינות
        this.functions = new Map();
        for (const fn of ast.functions) {
            this.functions.set(fn.name, fn);
        }

        // מחסנית קריאות
        this.callStack = [];

        // מעקב אחר הקובץ והשורה הנוכחיים בהרצה
        this.currentFile = 'Program.cs';
        this.currentLine = 1;

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
        this.initialQueuesList = [];
        this.initialQueuesSnapshotList = [];

        // בדיקת פרמטרים של פונקציית הכניסה (Main או פונקציה ראשונה)
        if (entryFunction) {
            const totalParams = entryFunction.params.length;
            for (let pIdx = 0; pIdx < totalParams; pIdx++) {
                const param = entryFunction.params[pIdx];
                const rawVal = this.getParamRawValue(param.name, pIdx, totalParams);

                if (param.type.startsWith('Queue')) {
                    const match = param.type.match(/^Queue<(.+)>$/);
                    const qType = match ? match[1].trim() : 'int';
                    const itemsToUse = (rawVal !== undefined && rawVal !== null)
                        ? rawVal
                        : this.generateDefaultQueueValues(qType, pIdx);

                    const queueInst = this.buildQueueInstance(param.name, itemsToUse, qType);
                    this.queues.set(param.name, queueInst);
                    initialArgs.push(queueInst);

                    this.initialQueuesList.push({
                        name: param.name,
                        type: qType,
                        items: this.snapshotItems(queueInst.items)
                    });
                    this.initialQueuesSnapshotList.push({
                        name: param.name,
                        items: this.snapshotItems(queueInst.items)
                    });

                    if (!this.hasInitialQueue) {
                        this.hasInitialQueue = true;
                        this.initialQueueName = param.name;
                        this.initialQueueType = qType;
                        this.initialQueueSnapshot = this.snapshotItems(queueInst.items);
                    }
                } else if (param.type.startsWith('Stack')) {
                    const match = param.type.match(/^Stack<(.+)>$/);
                    const stType = match ? match[1].trim() : 'int';
                    const itemsToUse = (rawVal !== undefined && rawVal !== null)
                        ? rawVal
                        : this.generateDefaultStackValues(stType, pIdx);

                    const stackInst = this.buildStackInstance(param.name, itemsToUse, stType);
                    this.stacks.set(param.name, stackInst);
                    initialArgs.push(stackInst);

                    this.initialStacksList.push({
                        name: param.name,
                        type: stType,
                        items: this.snapshotItems(stackInst.items)
                    });
                    this.initialStacksSnapshotList.push({
                        name: param.name,
                        items: this.snapshotItems(stackInst.items)
                    });

                    if (!this.hasInitialStack) {
                        this.hasInitialStack = true;
                        this.initialStackName = param.name;
                        this.initialStackType = stType;
                        this.initialStackSnapshot = this.snapshotItems(stackInst.items);
                    }
                } else if (param.type.startsWith('Node')) {
                    const chainInst = buildNodeChain(Array.isArray(rawVal) ? rawVal : (rawVal !== undefined && rawVal !== null ? [rawVal] : [12, 5, 8, 20]));
                    initialArgs.push(chainInst);
                } else if (param.type.startsWith('BinNode')) {
                    const treeInst = buildBinTree(rawVal !== undefined && rawVal !== null ? rawVal : [10, 5, 15, 3, 7]);
                    initialArgs.push(treeInst);
                } else {
                    const parsedVal = this.parsePrimitiveParamValue(rawVal, param.type, param.name);
                    initialArgs.push(parsedVal);
                }
            }
        }

        // הוספת פסיעת התחלה
        let startMsg = 'התחלת ריצת התוכנית';
        const inits = [];
        if (this.initialQueuesList.length > 0) {
            inits.push(`${this.initialQueuesList.length} תורים (${this.initialQueuesList.map(q => q.name).join(', ')})`);
        }
        if (this.initialStacksList.length > 0) {
            inits.push(`${this.initialStacksList.length} מחסניות (${this.initialStacksList.map(s => s.name).join(', ')})`);
        }
        if (inits.length > 0) {
            startMsg = `התחלת ריצת התוכנית (אותחלו ${inits.join(', ')})`;
        }
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

        // בדיקת שימור תורים ומחסניות מקוריות בסיום כנדרש בבגרות
        let originalPreserved = true;
        let endDesc = 'התוכנית הסתיימה בהצלחה!';

        const modifiedStructures = [];
        if (this.initialQueuesSnapshotList && this.initialQueuesSnapshotList.length > 0) {
            for (const initQ of this.initialQueuesSnapshotList) {
                const finalQ = this.queues.get(initQ.name);
                let preserved = true;
                if (!finalQ || finalQ.items.length !== initQ.items.length) {
                    preserved = false;
                } else {
                    for (let i = 0; i < initQ.items.length; i++) {
                        if (this.formatVal(finalQ.items[i]) !== this.formatVal(initQ.items[i])) {
                            preserved = false;
                            break;
                        }
                    }
                }
                if (!preserved) {
                    originalPreserved = false;
                    modifiedStructures.push(`תור ${initQ.name}`);
                }
            }
        }

        if (this.initialStacksSnapshotList && this.initialStacksSnapshotList.length > 0) {
            for (const initS of this.initialStacksSnapshotList) {
                const finalS = this.stacks.get(initS.name);
                let preserved = true;
                if (!finalS || finalS.items.length !== initS.items.length) {
                    preserved = false;
                } else {
                    for (let i = 0; i < initS.items.length; i++) {
                        if (this.formatVal(finalS.items[i]) !== this.formatVal(initS.items[i])) {
                            preserved = false;
                            break;
                        }
                    }
                }
                if (!preserved) {
                    originalPreserved = false;
                    modifiedStructures.push(`מחסנית ${initS.name}`);
                }
            }
        }

        if (modifiedStructures.length > 0) {
            endDesc = `התוכנית הסתיימה, אך שים לב: המבנה/ים (${modifiedStructures.join(', ')}) לא שוחזרו למצבם המקורי (הפרת כלל הברזל בבגרות)!`;
        } else if (this.initialQueuesSnapshotList.length > 0 || this.initialStacksSnapshotList.length > 0) {
            endDesc = `התוכנית הסתיימה בהצלחה! כל מבני הנתונים המקוריים נשמרו במלואם כנדרש בבגרות.`;
        }

        this.recordFrame(this.frames.length > 0 ? this.frames[this.frames.length - 1].line : 1, endDesc, 'idle', true, originalPreserved);

        return {
            frames: this.frames,
            error: null,
            hasInitialQueue: this.hasInitialQueue,
            initialQueueName: this.initialQueueName,
            initialQueueType: this.initialQueueType || 'int',
            initialQueuesList: this.initialQueuesList,
            hasInitialStack: this.hasInitialStack,
            initialStackName: this.initialStackName,
            initialStackType: this.initialStackType || 'int',
            initialStacksList: this.initialStacksList,
            params: entryFunction ? entryFunction.params.map(p => ({
                name: p.name,
                type: p.type,
                isQueue: p.type.startsWith('Queue'),
                queueItemType: p.type.startsWith('Queue') ? (p.type.match(/^Queue<(.+)>$/) ? p.type.match(/^Queue<(.+)>$/)[1].trim() : 'int') : null,
                isStack: p.type.startsWith('Stack'),
                stackItemType: p.type.startsWith('Stack') ? (p.type.match(/^Stack<(.+)>$/) ? p.type.match(/^Stack<(.+)>$/)[1].trim() : 'int') : null,
                isNode: p.type.startsWith('Node'),
                nodeItemType: p.type.startsWith('Node') ? (p.type.match(/^Node<(.+)>$/) ? p.type.match(/^Node<(.+)>$/)[1].trim() : 'int') : null,
                isBinNode: p.type.startsWith('BinNode'),
                binNodeItemType: p.type.startsWith('BinNode') ? (p.type.match(/^BinNode<(.+)>$/) ? p.type.match(/^BinNode<(.+)>$/)[1].trim() : 'int') : null
            })) : [],
            originalPreserved,
            consoleOutputs: this.consoleOutputs
        };
    }

    getParamRawValue(paramName, pIdx, totalParams) {
        if (!this.initialValues) return undefined;
        if (typeof this.initialValues === 'object' && !Array.isArray(this.initialValues)) {
            if (this.initialValues[paramName] !== undefined) {
                return this.initialValues[paramName];
            }
            const lower = paramName.toLowerCase();
            for (const k of Object.keys(this.initialValues)) {
                if (k.toLowerCase() === lower) return this.initialValues[k];
            }
        }
        if (Array.isArray(this.initialValues)) {
            if (pIdx === 0 && (totalParams === 1 || !Array.isArray(this.initialValues[0]))) {
                return this.initialValues;
            }
            if (this.initialValues[pIdx] !== undefined) {
                return this.initialValues[pIdx];
            }
        }
        return undefined;
    }

    buildQueueInstance(paramName, rawValues, qType) {
        let queueInst;
        if (qType.startsWith('Queue')) {
            const subType = qType.match(/^Queue<(.+)>$/) ? qType.match(/^Queue<(.+)>$/)[1].trim() : 'int';
            queueInst = new QueueInstance(paramName, [], qType);
            this.queues.set(paramName, queueInst);
            if (Array.isArray(rawValues)) {
                rawValues.forEach((sub, sIdx) => {
                    if (sub instanceof QueueInstance) {
                        queueInst.insert(sub);
                    } else if (Array.isArray(sub)) {
                        const subQ = new QueueInstance(`${paramName}_sub_${sIdx + 1}`, sub, subType);
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
            queueInst = new QueueInstance(paramName, [], qType);
            if (Array.isArray(rawValues)) {
                rawValues.forEach(val => {
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
            const arr = Array.isArray(rawValues) ? rawValues : [];
            queueInst = new QueueInstance(paramName, arr, qType);
        }
        return queueInst;
    }

    parsePrimitiveParamValue(rawVal, paramType, paramName) {
        if (rawVal === undefined || rawVal === null) {
            if (paramType === 'string') return paramName || 'text';
            if (paramType === 'char') return 'a';
            if (paramType === 'bool') return true;
            return 0;
        }
        if (paramType === 'string') {
            let str = String(rawVal);
            if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
                str = str.slice(1, -1);
            }
            return str;
        }
        if (paramType === 'char') {
            let str = String(rawVal).trim();
            if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
                str = str.slice(1, -1);
            }
            return str.length > 0 ? str[0] : 'a';
        }
        if (paramType === 'bool') {
            if (typeof rawVal === 'boolean') return rawVal;
            return String(rawVal).trim().toLowerCase() === 'true';
        }
        let clean = String(rawVal).trim();
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
            clean = clean.slice(1, -1);
        }
        const num = Number(clean);
        return isNaN(num) ? 0 : num;
    }

    generateDefaultQueueValues(qType, pIdx) {
        if (qType === 'char') {
            return pIdx === 0 ? ['a', 'b', 'c', 'd'] : ['x', 'y', 'z'];
        }
        if (qType === 'string') {
            return pIdx === 0 ? ['apple', 'banana', 'cherry'] : ['first', 'second', 'third'];
        }
        if (qType === 'Point') {
            return [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
        }
        if (qType.startsWith('Queue')) {
            return [[10, 20], [30, 40], [50, 60]];
        }
        return pIdx === 0 ? [14, 7, 25, 9, 31] : [4, 18, 5, 2];
    }

    buildStackInstance(paramName, rawValues, stType) {
        let stackInst;
        if (stType.startsWith('Stack')) {
            const subType = stType.match(/^Stack<(.+)>$/) ? stType.match(/^Stack<(.+)>$/)[1].trim() : 'int';
            stackInst = new StackInstance(paramName, [], stType);
            this.stacks.set(paramName, stackInst);
            if (Array.isArray(rawValues)) {
                rawValues.forEach((sub, sIdx) => {
                    if (sub instanceof StackInstance) {
                        stackInst.push(sub);
                    } else if (Array.isArray(sub)) {
                        const subSt = new StackInstance(`${paramName}_sub_${sIdx + 1}`, sub, subType);
                        this.stacks.set(subSt.name, subSt);
                        stackInst.push(subSt);
                    }
                });
            }
        } else if (this.classes.has(stType) || (!['int', 'char', 'string', 'bool', 'double', 'float', 'long'].includes(stType) && !stType.startsWith('Stack') && !stType.startsWith('Queue'))) {
            const classDecl = this.classes.get(stType);
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
            stackInst = new StackInstance(paramName, [], stType);
            if (Array.isArray(rawValues)) {
                rawValues.forEach(val => {
                    if (val instanceof ClassInstance) {
                        stackInst.push(val);
                    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                        const rawFields = val.fields || val;
                        const inst = new ClassInstance(stType, {}, fieldMeta, propMeta);
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
                        stackInst.push(inst);
                    } else if (Array.isArray(val)) {
                        const inst = new ClassInstance(stType, {}, fieldMeta, propMeta);
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
                        stackInst.push(inst);
                    } else if (val !== null && val !== undefined) {
                        const inst = new ClassInstance(stType, {}, fieldMeta, propMeta);
                        if (classDecl && classDecl.fields && classDecl.fields.length > 0) {
                            inst.fields[classDecl.fields[0].name] = val;
                            for (const m of classDecl.methods) {
                                inst.methods.set(m.name, m);
                            }
                        } else {
                            inst.fields['value'] = val;
                        }
                        stackInst.push(inst);
                    }
                });
            }
        } else {
            const arr = Array.isArray(rawValues) ? rawValues : [];
            stackInst = new StackInstance(paramName, arr, stType);
        }
        return stackInst;
    }

    generateDefaultStackValues(stType, pIdx) {
        if (stType === 'char') {
            return pIdx === 0 ? ['a', 'b', 'c', 'd'] : ['x', 'y', 'z'];
        }
        if (stType === 'string') {
            return pIdx === 0 ? ['apple', 'banana', 'cherry'] : ['first', 'second', 'third'];
        }
        if (stType === 'Point') {
            return [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];
        }
        if (stType.startsWith('Stack')) {
            return [[10, 20], [30, 40], [50, 60]];
        }
        return pIdx === 0 ? [10, 20, 30, 40] : [5, 15, 25, 35];
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
            // אם הפרמטר הוא מחסנית, נרשום אותה במפת המחסניות
            if (argVal instanceof StackInstance) {
                this.stacks.set(param.name, argVal);
            }
        }

        const prevFile = this.currentFile;
        if (fn.file) this.currentFile = fn.file;
        if (fn.line) this.currentLine = fn.line;

        const frameInfo = {
            funcName: `${fn.name}(${fn.params.map(p => p.name).join(', ')})`,
            scope,
            line: fn.line,
            file: fn.file || this.currentFile || 'Program.cs'
        };
        this.callStack.push(frameInfo);

        this.recordFrame(fn.line, `כניסה לפונקציה ${fn.name}`);

        let returnVal = undefined;
        try {
            for (const stmt of fn.body) {
                returnVal = this.executeStatement(stmt, scope);
                if (returnVal !== undefined) {
                    break;
                }
            }
        } finally {
            this.callStack.pop();
            this.recordFrame(fn.line, `סיום פונקציה ${fn.name}${returnVal !== undefined ? `, הוחזר: ${this.formatVal(returnVal)}` : ''}`);
            this.currentFile = prevFile;
        }

        return returnVal;
    }

    executeStatement(stmt, scope) {
        this.checkStepLimit(stmt.line);
        if (stmt.file) this.currentFile = stmt.file;
        if (stmt.line) this.currentLine = stmt.line;

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
                const isStack = stmt.varType.startsWith('Stack') || (val instanceof StackInstance);
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
                } else if (isStack) {
                    const match = stmt.varType.match(/^Stack<(.+)>$/);
                    const stType = match ? match[1].trim() : (val instanceof StackInstance ? (val.itemType || 'int') : 'int');
                    if (!(val instanceof StackInstance)) {
                        val = new StackInstance(stmt.varName, [], stType);
                    } else {
                        val.name = stmt.varName;
                        if (!val.itemType) val.itemType = stType;
                    }
                    this.stacks.set(stmt.varName, val);
                    scope.set(stmt.varName, val);
                    this.recordFrame(stmt.line, `אתחול ויצירת מחסנית חדשה בחלון: ${stmt.varName} = new ${stmt.varType || 'Stack'}()`, 'idle', false, null, null, null, stmt.varName);
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
                        if (finalVal instanceof StackInstance) {
                            finalVal.name = targetName;
                            this.stacks.set(targetName, finalVal);
                            this.recordFrame(expr.line, `אתחול והשמת מחסנית חדשה בחלון: ${targetName} = new Stack()`, 'idle', false, null, null, null, targetName);
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
                    if (finalVal instanceof StackInstance) {
                        finalVal.name = targetName;
                        this.stacks.set(targetName, finalVal);
                        this.recordFrame(expr.line, `אתחול והשמת מחסנית חדשה בחלון: ${targetName} = new Stack()`, 'idle', false, null, null, null, targetName);
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

                if (expr.className.startsWith('Stack')) {
                    let innerType = 'int';
                    const stMatch = expr.className.match(/^Stack<(.+)>$/);
                    if (stMatch) {
                        innerType = stMatch[1].trim();
                    }
                    const newSt = new StackInstance('temp_st_' + (this.stacks.size + 1), [], innerType);
                    return newSt;
                }

                if (expr.className.startsWith('Node')) {
                    const info = expr.arguments && expr.arguments.length > 0 ? this.evaluateExpression(expr.arguments[0], scope) : 0;
                    const next = expr.arguments && expr.arguments.length > 1 ? this.evaluateExpression(expr.arguments[1], scope) : null;
                    return new NodeInstance(info, next);
                }

                if (expr.className.startsWith('BinNode')) {
                    const val = expr.arguments && expr.arguments.length > 0 ? this.evaluateExpression(expr.arguments[0], scope) : 0;
                    const left = expr.arguments && expr.arguments.length > 1 ? this.evaluateExpression(expr.arguments[1], scope) : null;
                    const right = expr.arguments && expr.arguments.length > 2 ? this.evaluateExpression(expr.arguments[2], scope) : null;
                    return new BinNodeInstance(val, left, right);
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
                        const prevFile = this.currentFile;
                        if (classDecl.file) this.currentFile = classDecl.file;
                        this.checkAccess(instance, ctor.access || 'public', scope, `הבנאי של '${classDecl.name}'`, expr.line);
                        const ctorScope = new Map();
                        ctorScope.set('this', instance);
                        ctor.params.forEach((param, idx) => {
                            ctorScope.set(param.name, evalArgs[idx] !== undefined ? evalArgs[idx] : 0);
                        });
                        this.callStack.push({
                            funcName: `${classDecl.name} (בנאי Constructor)`,
                            line: expr.line,
                            file: classDecl.file || this.currentFile || 'Program.cs',
                            scope: ctorScope
                        });
                        this.recordFrame(expr.line, `קריאה לבנאי new ${classDecl.name}(${evalArgs.map(v => this.formatVal(v)).join(', ')})`);

                        for (const stmt of ctor.body) {
                            const ret = this.executeStatement(stmt, ctorScope);
                            if (ret !== undefined) break;
                        }
                        this.callStack.pop();
                        this.recordFrame(expr.line, `סיום בנאי ${classDecl.name} ויצירת מופע חדש: ${this.formatVal(instance)}`);
                        this.currentFile = prevFile;
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
                            const prevFile = this.currentFile;
                            if (methodDecl.file) this.currentFile = methodDecl.file;
                            this.checkAccess(obj, methodDecl.access || 'public', scope, `הפעולה '${obj.className}.ToString()'`, expr.line);
                            const mScope = new Map();
                            mScope.set('this', obj);
                            this.callStack.push({
                                funcName: `${obj.className}.ToString()`,
                                line: expr.line,
                                file: methodDecl.file || this.currentFile || 'Program.cs',
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
                            this.currentFile = prevFile;
                            return res !== null ? String(res) : obj.toString();
                        }
                        return obj.toString();
                    }

                    if (obj.methods.has(expr.method)) {
                        const methodDecl = obj.methods.get(expr.method);
                        const prevFile = this.currentFile;
                        if (methodDecl.file) this.currentFile = methodDecl.file;
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
                            file: methodDecl.file || this.currentFile || 'Program.cs',
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
                        this.currentFile = prevFile;
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

                if (obj instanceof StackInstance) {
                    const methodName = expr.method;
                    if (methodName === 'Push') {
                        const pushVal = this.evaluateExpression(expr.arguments[0], scope);
                        obj.push(pushVal);
                        this.recordFrame(expr.line, `פעולת ${obj.name}.Push(${this.formatVal(pushVal)}): דחיפת ${this.formatVal(pushVal)} לראש המחסנית`, 'push', false, null, null, pushVal, obj.name);
                        return null;
                    } else if (methodName === 'Pop') {
                        try {
                            const poppedVal = obj.pop();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Pop(): שליפת ${this.formatVal(poppedVal)} מראש המחסנית`, 'pop', false, null, null, poppedVal, obj.name);
                            return poppedVal;
                        } catch (err) {
                            throw { line: expr.line, message: err.message };
                        }
                    } else if (methodName === 'Top') {
                        try {
                            const topVal = obj.top();
                            this.recordFrame(expr.line, `פעולת ${obj.name}.Top(): הצצה בראש המחסנית (${this.formatVal(topVal)}) ללא שינוי`, 'top', false, null, null, topVal, obj.name);
                            return topVal;
                        } catch (err) {
                            throw { line: expr.line, message: err.message };
                        }
                    } else if (methodName === 'IsEmpty') {
                        const isEmpty = obj.isEmpty();
                        this.recordFrame(expr.line, `פעולת ${obj.name}.IsEmpty(): בדיקת ריקנות -> ${isEmpty ? 'אמת (true)' : 'שקר (false)'}`, 'idle', false, null, null, null, obj.name);
                        return isEmpty;
                    } else {
                        throw { line: expr.line, message: `פעולה לא מוכרת '${methodName}' במחסנית (לפי תקן משרד החינוך הפעולות הן: Push, Pop, Top, IsEmpty)` };
                    }
                } else if (obj instanceof NodeInstance) {
                    const methodName = expr.method;
                    if (methodName === 'GetInfo') return obj.getInfo();
                    if (methodName === 'SetInfo') {
                        const val = this.evaluateExpression(expr.arguments[0], scope);
                        obj.setInfo(val);
                        return null;
                    }
                    if (methodName === 'GetNext') return obj.getNext();
                    if (methodName === 'SetNext') {
                        const nextObj = this.evaluateExpression(expr.arguments[0], scope);
                        obj.setNext(nextObj);
                        return null;
                    }
                    if (methodName === 'HasNext') return obj.hasNext();
                    if (methodName === 'ToString') return obj.toString();
                    throw { line: expr.line, message: `פעולה לא מוכרת '${methodName}' בחוליה Node` };
                } else if (obj instanceof BinNodeInstance) {
                    const methodName = expr.method;
                    if (methodName === 'GetValue') return obj.getValue();
                    if (methodName === 'SetValue') {
                        const val = this.evaluateExpression(expr.arguments[0], scope);
                        obj.setValue(val);
                        return null;
                    }
                    if (methodName === 'GetLeft') return obj.getLeft();
                    if (methodName === 'SetLeft') {
                        const sub = this.evaluateExpression(expr.arguments[0], scope);
                        obj.setLeft(sub);
                        return null;
                    }
                    if (methodName === 'GetRight') return obj.getRight();
                    if (methodName === 'SetRight') {
                        const sub = this.evaluateExpression(expr.arguments[0], scope);
                        obj.setRight(sub);
                        return null;
                    }
                    if (methodName === 'HasLeft') return obj.hasLeft();
                    if (methodName === 'HasRight') return obj.hasRight();
                    if (methodName === 'IsLeaf') return obj.isLeaf();
                    if (methodName === 'ToString') return obj.toString();
                    throw { line: expr.line, message: `פעולה לא מוכרת '${methodName}' בעץ בינארי BinNode` };
                } else {
                    const targetObjName = expr.object && expr.object.name ? `'${expr.object.name}'` : 'האובייקט';
                    throw { line: expr.line, message: `${targetObjName} אינו תור, מחסנית או אובייקט מאותחל` };
                }
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
            if (item instanceof StackInstance) {
                return {
                    isStack: true,
                    name: item.name,
                    itemType: item.itemType || 'int',
                    items: this.snapshotItems(item.items)
                };
            }
            if (item && typeof item === 'object' && item.isStack) {
                return {
                    isStack: true,
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

    recordFrame(line, description, opType = 'idle', isCompleted = false, originalPreserved = null, targetQueueName = null, targetValue = null, targetStackName = null) {
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

        // שכפול מצב המחסניות כולל אובייקטים (Deep Snapshotting)
        const stacksSnapshot = [];
        this.stacks.forEach((stInst, stName) => {
            stacksSnapshot.push({
                name: stName,
                id: stInst.id,
                itemType: stInst.itemType || 'int',
                items: this.snapshotItems(stInst.items),
                lastOp: (targetStackName === stName) ? opType : 'none',
                targetVal: (targetStackName === stName) ? (targetValue instanceof ClassInstance ? targetValue.clone() : (targetValue instanceof StackInstance ? targetValue.clone() : (targetValue instanceof QueueInstance ? targetValue.clone() : targetValue))) : null
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
                file: f.file || 'Program.cs',
                variables: vars
            };
        });

        const activeVariables = callStackSnapshot.length > 0
            ? callStackSnapshot[callStackSnapshot.length - 1].variables
            : {};

        this.frames.push({
            step: this.frames.length,
            line,
            file: this.currentFile || 'Program.cs',
            description,
            callStack: callStackSnapshot,
            queues: queuesSnapshot,
            stacks: stacksSnapshot,
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
                file: this.currentFile || 'Program.cs',
                message: `עצירת חירום: התוכנית עברה את מגבלת ${this.maxSteps} הצעדים (חשד ללולאה אינסופית או רקורסיה לא מרוסנת)!`
            };
        }
    }

    formatVal(val) {
        if (val instanceof QueueInstance) {
            return `Queue [${val.items.map(it => this.formatVal(it)).join(', ')}]`;
        }
        if (val instanceof StackInstance) {
            return `Stack [${val.items.map(it => this.formatVal(it)).join(', ')}]`;
        }
        if (val instanceof BinNodeInstance) {
            return `BinNode(${val.value})`;
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
        if (val && typeof val === 'object' && val.isStack) {
            return `Stack [${val.items.map(it => this.formatVal(it)).join(', ')}]`;
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
    window.StackInstance = StackInstance;
    window.NodeInstance = NodeInstance;
    window.BinNodeInstance = BinNodeInstance;
    window.ClassInstance = ClassInstance;
    window.buildBinTree = buildBinTree;
    window.parseBinTreeInput = parseBinTreeInput;
    window.treeToPathMap = treeToPathMap;
    window.treeToCanonicalString = treeToCanonicalString;
    window.treeToLevels = treeToLevels;
    window.setNodeAtPath = setNodeAtPath;
    window.removeNodeAtPath = removeNodeAtPath;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CSharpQueueInterpreter,
        QueueInstance,
        StackInstance,
        NodeInstance,
        BinNodeInstance,
        ClassInstance,
        RuntimeEnvironment,
        buildBinTree,
        parseBinTreeInput,
        treeToPathMap,
        treeToCanonicalString,
        treeToLevels,
        setNodeAtPath,
        removeNodeAtPath
    };
}
