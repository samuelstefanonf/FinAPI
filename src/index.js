const express = require("express");
const { v4: uuidv4 } = require("uuid");


const app = express();

app.use(express.json());

// array que irá armazenar os dados - aplicação sem SQL
const customers = [];

// Middleware
// parâmetro next verifica se o middleware irá prosseguir a operação ou se irá parar
function verifyIfExistsAccountCPF(request, response, next){
    const { cpf } = request.headers;

    // procurar e retornar find() a informação solicitada
    const customer = customers.find((customer) => customer.cpf === cpf);

    if(!customer) {
        return response.status(400).json({ error: "Customer not found"});
    }

    request.customer = customer;

    return next();
}

function getBalance(statement){
    // reduce  = função que transforma os valores em um valor - calculo entrou - saiu = total
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit'){
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }


    }, 0);

    return balance;
}

// criar dados usa o POST
app.post("/account", (request, response) => {
    // Tratar de inserção de dados o parâmetro é request.body
    const { cpf, name } = request.body;
    
    // variavel que ira percorrer o array customers e verificar se já existe o cpf informado
    const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);
    // caso já esteja cadastrado o cpf
    if(customerAlreadyExists){
        return response.status(400).json({ error: "Customer already exists!" });
    };

    // caso não esteja cadastrado, irá cadastrar

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: [],
    });

    return response.status(201).send();

});

// buscar (get) extrato bancário
app.get("/statement", verifyIfExistsAccountCPF,(request, response) => {
    const { customer } = request;
    return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description, 
        amount,
        created_at:  new Date(),
        type: "credit"
    };
    
    customer.statement.push(statementOperation);

    return response.status(201).json();
});


app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount) {
        return response.status(400).send({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
})

app.get("/statement/date", verifyIfExistsAccountCPF,(request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())

    return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF,(request, response) => {
    const { name } =  request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF,(request, response) => {
    const { customer } = request;

    return response.json(customer);
})

app.delete("/account", verifyIfExistsAccountCPF,(request, response) => {
    const { customer } =  request;

    customers.splice(customers.indexOf(customer),1);

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3333);