const fs = require('fs');

function readFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error("Error reading file:", err.message);
        return null;
    }
}
class ASTNode {
    constructor(nodeType, value = null, children = []) {
        this.nodeType = nodeType;
        this.value = value;
        this.children = children;
    }

    toString() {
        return `ASTNode(${this.nodeType}, ${this.value}, ${JSON.stringify(this.children)})`;
    }
}

// PART 1: Build the Symbol Table
function buildSymbolTable(sourceCode) {
    const varBlockPattern = /VAR(.*?)(BEGIN|END\.)/s;
    const varBlockMatch = sourceCode.match(varBlockPattern);

    if (!varBlockMatch) {
        throw new Error("No VAR section found in the source code.");
    }

    const varBlock = varBlockMatch[1];
    const varDeclarationPattern = /([\w, ]+)\s*:\s*(INTEGER|REAL|BOOLEAN|CHAR);/g;

    const symbolTable = {};
    let match;

    while ((match = varDeclarationPattern.exec(varBlock)) !== null) {
        const variables = match[1].split(",").map(v => v.trim());
        const varType = match[2];

        for (const variable of variables) {
            if (symbolTable[variable]) {
                throw new Error(`Duplicate declaration of variable: ${variable}`);
            }
            symbolTable[variable] = { type: varType };
        }
    }

    return symbolTable;
}

// PART 2: Parse Instructions into an AST
function parseInstructions(sourceCode) {
    const instructions = [];
    const lines = sourceCode.split(/\n/).map(line => line.trim()).filter(line => line);
    let currentInstruction = "";

    for (const line of lines) {
        currentInstruction += line + " ";
        if (line.endsWith(";") || /END\./.test(line)) {
            instructions.push(currentInstruction.trim());
            currentInstruction = "";
        }
    }

    if (currentInstruction.trim()) {
        instructions.push(currentInstruction.trim());
    }

    return instructions;
}

function parseInstruction(instruction) {
    const assignmentPattern = /^(\w+)\s*:=\s*(.+)$/;
    const ifPattern = /^IF\s+(.+)\s+THEN\s+(.+)$/;
    const elsePattern = /^ELSE\s+(.+)$/;
    const whilePattern = /^WHILE\s+(.+)\s+DO\s+(.+)$/;
    const writePattern = /^WRITELN\((.+)\)$/;

    let match;

    // Parse Assignment
    if ((match = instruction.match(assignmentPattern))) {
        const variable = match[1].trim(); // Trim extra spaces
        const expression = match[2];
        return new ASTNode("Assignment", variable, [parseExpression(expression)]);
    }

    // Parse IF condition
    if ((match = instruction.match(ifPattern))) {
        const condition = match[1];
        const thenInstruction = match[2];
        return new ASTNode("If", null, [
            parseExpression(condition),
            parseInstruction(thenInstruction),
        ]);
    }

    // Parse ELSE instruction
    if ((match = instruction.match(elsePattern))) {
        const elseInstruction = match[1];
        return new ASTNode("Else", null, [parseInstruction(elseInstruction)]);
    }

    // Parse WHILE loop
    if ((match = instruction.match(whilePattern))) {
        const condition = match[1];
        const doInstruction = match[2];
        return new ASTNode("While", null, [
            parseExpression(condition),
            parseInstruction(doInstruction),
        ]);
    }

    // Parse WRITELN
    if ((match = instruction.match(writePattern))) {
        const expressions = match[1].split(",").map(expr => parseExpression(expr.trim()));
        return new ASTNode("Write", null, expressions);
    }

    throw new Error(`Unknown instruction: ${instruction}`);
}


function parseExpression(expression) {
    const comparisonOps = ["<", "<=", ">", ">=", "=", "<>"];
    for (const op of comparisonOps) {
        if (expression.includes(op)) {
            const [left, right] = expression.split(op).map(part => part.trim());
            return new ASTNode("Comparison", op, [
                parseExpression(left),
                parseExpression(right)
            ]);
        }
    }

    const arithmeticOps = ["+", "-", "*", "/"];
    for (const op of arithmeticOps) {
        if (expression.includes(op)) {
            const [left, right] = expression.split(op, 2).map(part => part.trim());
            return new ASTNode("Arithmetic", op, [
                parseExpression(left),
                parseExpression(right)
            ]);
        }
    }

    if (/^\d+$/.test(expression)) {
        return new ASTNode("Integer", parseInt(expression, 10));
    } else if (/^'[^']*'$/.test(expression)) {
        return new ASTNode("String", expression.slice(1, -1));
    } else {
        return new ASTNode("Variable", expression.trim()); // Trim variable names
    }
}


// PART 3: Semantic Check and Attribute Grammar
// PART 3: Semantic Check and Attribute Grammar
function semanticCheckAST(node, symbolTable) {
    switch (node.nodeType) {
        case "Assignment":
            const varName = node.value;
            const [exprValue, exprType] = semanticCheckAST(node.children[0], symbolTable);
            if (!symbolTable[varName]) {
                throw new Error(`Undeclared variable: ${varName}`);
            }
            const varType = symbolTable[varName].type;
            if (varType !== exprType && !(varType === "REAL" && exprType === "INTEGER")) {
                throw new Error(`Type mismatch: cannot assign ${exprType} to ${varType}`);
            }
            return [null, varType];

        case "Arithmetic":
            const leftType = semanticCheckAST(node.children[0], symbolTable)[1];
            const rightType = semanticCheckAST(node.children[1], symbolTable)[1];
            if (leftType !== "INTEGER" || rightType !== "INTEGER") {
                throw new Error("Arithmetic operations only support INTEGER types");
            }
            return [null, "INTEGER"];

        case "Comparison":
            const leftCompType = semanticCheckAST(node.children[0], symbolTable)[1];
            const rightCompType = semanticCheckAST(node.children[1], symbolTable)[1];
            if (leftCompType !== rightCompType) {
                throw new Error("Type mismatch in comparison");
            }
            return [null, "BOOLEAN"];

        case "Variable":
            if (!symbolTable[node.value]) {
                throw new Error(`Undeclared variable: ${node.value}`);
            }
            return [null, symbolTable[node.value].type];

        case "Integer":
            return [node.value, "INTEGER"]; // Return the integer value and its type

        case "String":
            return [node.value, "STRING"]; // Return the string value and its type

        case "If":
            const conditionType = semanticCheckAST(node.children[0], symbolTable)[1];
            if (conditionType !== "BOOLEAN") {
                throw new Error("IF condition must evaluate to BOOLEAN");
            }
            semanticCheckAST(node.children[1], symbolTable);
            if (node.children.length > 2) {
                semanticCheckAST(node.children[2], symbolTable);
            }
            return [null, "VOID"];

        case "While":
            const whileConditionType = semanticCheckAST(node.children[0], symbolTable)[1];
            if (whileConditionType !== "BOOLEAN") {
                throw new Error("WHILE condition must evaluate to BOOLEAN");
            }
            semanticCheckAST(node.children[1], symbolTable);
            return [null, "VOID"];

        case "Write":
            for (const child of node.children) {
                semanticCheckAST(child, symbolTable);
            }
            return [null, "VOID"];

        default:
            throw new Error(`Unknown node type: ${node.nodeType}`);
    }
}


// PART 4: Validation
function validateProgram(sourceCode) {
    try {
        const symbolTable = buildSymbolTable(sourceCode);
        console.log("Symbol Table:", symbolTable);

        const rawInstructions = sourceCode.split("BEGIN")[1].split("END.")[0];
        const instructions = parseInstructions(rawInstructions);

        for (const instruction of instructions) {
            const trimmedInstruction = instruction.replace(/;$/, "").trim();
            if (trimmedInstruction) {
                const ast = parseInstruction(trimmedInstruction);
                console.log("AST:", JSON.stringify(ast, null, 2));
                semanticCheckAST(ast, symbolTable);
            }
        }

        console.log("Validation passed: no errors.");
    } catch (e) {
        console.error("Validation error:", e.message);
    }
}

const filePath = './code.pas';  // Adjust the file path as needed
const sourceCode = readFile(filePath);

if (sourceCode) {
    validateProgram(sourceCode);
} else {
    console.log("No source code to validate.");
}
