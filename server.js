const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
var cors = require('cors');

const categories = require('./data/categories').categories;
const users = require('./data/users').users;
const authors = require('./data/authors').authors;
const poems = require('./data/poems').poems;

const app = express();
const port = 4000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'qwerty';

function createToken(user) {
    const payload = {
        sub: user.id
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30m'
    });
}

const verifyJwt = (token, secret) => new Promise((resolve, reject) => jwt.verify(token, secret, null, (err, payload) => {
    if (err) {
        reject(err);
    }

    resolve(payload);
}));

const verifyJWT = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, null, (error, payload) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(payload);
        });
    });
}

app.get('/users', (req, res) => {
    res.json(users);
});

app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    const castedId = Number(id);

    const user = users.find(u => u.id === castedId);

    res.json(user);
});

app.get('/recommended-poems', (req,res) => {
    const recommendedPoems = categories.map(category => {
        const topPoems = poems
                        .filter(poem => poem.categoryId === category.id)
                        .slice(0,5)
                        .map(poem => {
                            const author = authors.find(a => a.id === poem.authorId);
                            return {
                                title: poem.title,
                                author: author.name,
                                poemId: poem.id
                            }
                        });
        return {
            category: {
                id: category.id,
                name: category.name,
                slug: category.slug
            },
            topPoems: topPoems
        }
    })
    res.json(recommendedPoems);
});

app.get('/poems/:id', (req, res) => {
    const { id } = req.params;
    const castedId = Number(id);
    const selectedPoem = poems.find(poem => poem.id === castedId);
    const author = authors.find(a => a.id === selectedPoem.authorId);
    const category = categories.find(t => t.id === selectedPoem.categoryId);
    
    const poem = {
                id: selectedPoem.id,
                title: selectedPoem.title,
                author: author.name,
                content: selectedPoem.content,
                category: category
            };
    
    res.json(poem);
});

app.get('/poem-preview/:id', (req, res) => {
    const { id } = req.params;
    const castedId = Number(id);
    const selectedPoem = poems.find(poem => poem.id === castedId);
    const author = authors.find(a => a.id === selectedPoem.authorId);
    const category = categories.find(t => t.id === selectedPoem.categoryId);
    
    const previewLength = selectedPoem.content.length;
    const content = selectedPoem.content.slice(0, previewLength/2);
    const poem = {
                id: selectedPoem.id,
                title: selectedPoem.title,
                author: author.name,
                content: content,
                category: category
            };
    
    res.json(poem);
});

app.get('/categories', (req, res) => {
    res.json(categories);
});

app.get('/categories/:slug', (req, res) => {
    const { slug } = req.params;
    const category = categories.find(t => t.slug === slug);
    const filteredPoems = poems
        .filter(poem => poem.categoryId === category.id)
        .map(poem => {
            const author = authors.find(a => a.id === poem.authorId);
            return {
                    poemId: poem.id,
                    title: poem.title,
                    author: author.name
            };
        });
    
    const thematicPoems = {
        category: category,
        poems: filteredPoems
    }
    
    res.json(thematicPoems);
});

app.get('/authors', (req, res) => {
    res.json(authors);
});

app.get('/authors/:id', (req, res) => {
    const { id } = req.params;
    const castedId = Number(id);

    const author = authors.find(a => a.id === castedId);
    res.json(author);
});

app.post('/new-poem', (req, res) => {
    const { authorId, title, categoryId, content } = req.body;
    const id = poems.length + 1;
    const newPoem = { id, title, content, authorId, categoryId };
    poems.push(newPoem);
    res.json(newPoem);
});

app.post('/new-author', (req, res) => {
    const { name } = req.body;
    const isAuthorAlreadyExist = authors.find(a => a.name === name) !== undefined;

    if(!isAuthorAlreadyExist) {
        const id = authors.length + 1;
        const newAuthor = { id, name };
        authors.push(newAuthor);
        res.json(newAuthor);
    }
    else {
        res.status(500).json({ message: 'Author already exist' });
    }
});

app.post('/new-category', (req, res) => {
    const { name } = req.body;
    const isCategoryAlreadyExist = categories.find(c => c.name === name) !== undefined;

    if(!isCategoryAlreadyExist) {
        const id = categories.length + 1;
        const slug = name.toLowerCase();
        const newCategory = { id, name, slug };
        categories.push(newCategory);
        res.json(newCategory);
    }
    else {
        res.status(500).json({ message: 'Category already exist' });
    }
});

app.post('/login', async (req, res) => {
    const { userName, password } = req.body;
    const user = users.find(u => u.userName === userName);
    let userData = null;
    if(user) {
        if(user.password === password) {
            const token = createToken(user);
            await res.cookie('AUTH_COOKIE', token);
            userData = user.userName;
            res.json(userData);
        }
        else {
            res.status(500).json({ message: 'Wrong password' });
        }
    }
    else {
        res.status(500).json({ message: 'User Name not exist' });
    }    
});

app.post('/registration', async (req, res) => {
    const { userName, password } = req.body;
    const isUserNameOccupied = users.find(user => user.userName === userName) !== undefined;

    debugger;
    if (isUserNameOccupied){
        res.status(500).json({ message: 'User Name already exist' });
    }
    else {
        const id = users.length + 1;
        const newUser = { id, userName, password };
        users.push(newUser);
        const token = createToken(newUser);
        await res.cookie('AUTH_COOKIE', token);
        const userData = newUser.userName;
        res.json(userData);
    } 
});

app.get('/me', async (req, res) => {
    const token = req.cookies['AUTH_COOKIE'];

    try {
        const payload = await verifyJwt(token, JWT_SECRET);
        const userId = payload.sub;
        const user = users.find(user => user.id === userId);
        const userData = user.userName;
        res.json(userData);
    } catch (err) {
        res.clearCookie('AUTH_COOKIE');
        res.status(500).json({ error: err });
    }
});

app.get('/logout', async (req, res) => {
    const token = req.cookies['AUTH_COOKIE'];
    if(token){
        res.clearCookie('AUTH_COOKIE');
        res.json('User Logged Out');
    }
    else {
        res.status(500).json({ error: "cookies not found" });
    }
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`));