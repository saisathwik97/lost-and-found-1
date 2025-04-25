const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic route for testing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// MySQL Connection with SSL
const db = mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user: '4KQGiEoryhEidkP.root',
    password: 'RBjh5WeZSnaZZKAf',
    port: 4000,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, 'ssl', 'ca.pem'))
    }
});

// Handle MySQL connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        if (err.code === 'ECONNREFUSED') {
            console.error('Please make sure MySQL is running and the connection details are correct');
        }
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create database and tables
    initDatabase();
});

// Create database and tables if they don't exist
const initDatabase = () => {
    // First, create the database if it doesn't exist
    db.query('CREATE DATABASE IF NOT EXISTS lost_and_found', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            return;
        }
        
        // Switch to the database
        db.query('USE lost_and_found', (err) => {
            if (err) {
                console.error('Error switching to database:', err);
                return;
            }
            
            // Drop the existing tables if they exist
            db.query('DROP TABLE IF EXISTS messages', (err) => {
                if (err) {
                    console.error('Error dropping messages table:', err);
                    return;
                }
                
                db.query('DROP TABLE IF EXISTS items', (err) => {
                    if (err) {
                        console.error('Error dropping items table:', err);
                        return;
                    }
                    
                    // Create the items table
                    const createItemsTableQuery = `
                        CREATE TABLE IF NOT EXISTS items (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            title VARCHAR(255) NOT NULL,
                            description TEXT NOT NULL,
                            image_path VARCHAR(255),
                            type ENUM('lost', 'found') NOT NULL,
                            user_email VARCHAR(255) NOT NULL,
                            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `;
                    
                    db.query(createItemsTableQuery, (err) => {
                        if (err) {
                            console.error('Error creating items table:', err);
                            return;
                        }
                        
                        // Create the messages table
                        const createMessagesTableQuery = `
                            CREATE TABLE IF NOT EXISTS messages (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                sender_email VARCHAR(255) NOT NULL,
                                receiver_email VARCHAR(255) NOT NULL,
                                message TEXT NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                is_read BOOLEAN DEFAULT FALSE
                            )
                        `;
                        
                        db.query(createMessagesTableQuery, (err) => {
                            if (err) {
                                console.error('Error creating messages table:', err);
                                return;
                            }
                            console.log('Database and tables initialized successfully');
                        });
                    });
                });
            });
        });
    });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Routes
app.post('/api/items', upload.single('image'), (req, res) => {
    try {
        const { title, description, type, userEmail } = req.body;
        
        if (!title || !description || !type || !userEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Handle optional image upload
        let imagePath = null;
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        // First ensure we're using the correct database
        db.query('USE lost_and_found', (err) => {
            if (err) {
                console.error('Error switching to database:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            const query = `
                INSERT INTO items (title, description, image_path, type, user_email, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            `;

            // If no image, use NULL in the query
            const imageValue = imagePath || null;

            db.query(query, [title, description, imageValue, type, userEmail], (err, result) => {
                if (err) {
                    console.error('Error inserting item:', err);
                    return res.status(500).json({ error: 'Error posting item to database: ' + err.message });
                }
                res.json({ id: result.insertId, message: 'Item posted successfully' });
            });
        });
    } catch (error) {
        console.error('Error in item posting route:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

app.get('/api/items', (req, res) => {
    const query = `
        SELECT * FROM items 
        WHERE status = 'approved'
        ORDER BY created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching items:', err);
            return res.status(500).json({ error: 'Error fetching items' });
        }
        res.json(results);
    });
});

app.get('/api/items/pending', (req, res) => {
    const query = `
        SELECT * FROM items 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching pending items:', err);
            return res.status(500).json({ error: 'Error fetching pending items' });
        }
        res.json(results);
    });
});

app.post('/api/items/:id/approve', (req, res) => {
    const query = `
        UPDATE items 
        SET status = 'approved'
        WHERE id = ?
    `;

    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error approving item:', err);
            return res.status(500).json({ error: 'Error approving item' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ message: 'Item approved successfully' });
    });
});

app.post('/api/items/:id/reject', (req, res) => {
    const query = `
        UPDATE items 
        SET status = 'rejected'
        WHERE id = ?
    `;

    db.query(query, [req.params.id], (err) => {
        if (err) {
            console.error('Error rejecting item:', err);
            return res.status(500).json({ error: 'Error rejecting item' });
        }
        res.json({ message: 'Item rejected successfully' });
    });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login route
app.post('/api/login', (req, res) => {
    const { email, password, type } = req.body;
    
    // Admin credentials
    if (type === 'admin' && email === 'admin@email.com' && password === 'admin123') {
        res.json({ success: true, message: 'Admin login successful' });
    } 
    // Student credentials
    else if (type === 'student' && 
        ((email === '23241a05j0@gmail.com' && password === '1234') || 
         (email === '23241a05h7@gmail.com' && password === '1234') ||
         (email === '23241a05g9@gmail.com' && password === '23241a05g9'))) {
        res.json({ success: true, message: 'Student login successful' });
    } 
    else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Get approved items for students
app.get('/api/items/approved', (req, res) => {
    const query = `
        SELECT * FROM items 
        WHERE status = 'approved'
        ORDER BY created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching approved items:', err);
            return res.status(500).json({ error: 'Error fetching approved items' });
        }
        res.json(results);
    });
});

// Get items by user email
app.get('/api/items/user/:email', (req, res) => {
    const query = `
        SELECT * FROM items 
        WHERE user_email = ?
        ORDER BY created_at DESC
    `;

    db.query(query, [req.params.email], (err, results) => {
        if (err) {
            console.error('Error fetching user items:', err);
            return res.status(500).json({ error: 'Error fetching user items' });
        }
        res.json(results);
    });
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
    const itemId = req.params.id;
    const userEmail = req.headers['user-email'];
    const userType = req.headers['user-type'];

    db.query('USE lost_and_found', (err) => {
        if (err) {
            console.error('Error switching to database:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // First get the item details including image path
        const getItemQuery = 'SELECT user_email, image_path FROM items WHERE id = ?';
        db.query(getItemQuery, [itemId], (err, results) => {
            if (err) {
                console.error('Error fetching item:', err);
                return res.status(500).json({ error: 'Error fetching item' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const item = results[0];

            // Check if user is admin or the owner of the item
            if (userType !== 'admin' && item.user_email !== userEmail) {
                return res.status(403).json({ error: 'You can only delete your own items' });
            }

            // Delete the item from database
            const deleteQuery = 'DELETE FROM items WHERE id = ?';
            db.query(deleteQuery, [itemId], (err) => {
                if (err) {
                    console.error('Error deleting item:', err);
                    return res.status(500).json({ error: 'Error deleting item' });
                }

                // Delete the associated image file if it exists
                if (item.image_path) {
                    const imagePath = path.join(__dirname, 'public', item.image_path);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('Error deleting image file:', err);
                        }
                    });
                }

                res.json({ message: 'Item deleted successfully' });
            });
        });
    });
});

// Chat routes
app.post('/api/messages', (req, res) => {
    const { sender_email, receiver_email, message } = req.body;
    
    if (!sender_email || !receiver_email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const query = `
        INSERT INTO messages (sender_email, receiver_email, message)
        VALUES (?, ?, ?)
    `;
    
    db.query(query, [sender_email, receiver_email, message], (err, result) => {
        if (err) {
            console.error('Error sending message:', err);
            return res.status(500).json({ error: 'Error sending message' });
        }
        res.json({ id: result.insertId, message: 'Message sent successfully' });
    });
});

app.get('/api/messages/:user_email', (req, res) => {
    const user_email = req.params.user_email;
    const other_user = req.query.other_user;
    
    const query = `
        SELECT * FROM messages 
        WHERE (sender_email = ? AND receiver_email = ?)
           OR (sender_email = ? AND receiver_email = ?)
        ORDER BY created_at ASC
    `;
    
    db.query(query, [user_email, other_user, other_user, user_email], (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: 'Error fetching messages' });
        }
        res.json(results);
    });
});

app.get('/api/chat-users/:user_email', (req, res) => {
    const user_email = req.params.user_email;
    const user_type = req.query.user_type;
    
    let query;
    if (user_type === 'admin') {
        query = `
            SELECT DISTINCT sender_email as email 
            FROM messages 
            WHERE receiver_email = ?
            UNION
            SELECT DISTINCT receiver_email as email 
            FROM messages 
            WHERE sender_email = ?
        `;
    } else {
        query = `
            SELECT 'admin@email.com' as email
        `;
    }
    
    db.query(query, [user_email, user_email], (err, results) => {
        if (err) {
            console.error('Error fetching chat users:', err);
            return res.status(500).json({ error: 'Error fetching chat users' });
        }
        res.json(results);
    });
});

// Start the server with explicit host binding
const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Server bound to ${server.address().address}:${server.address().port}`);
}).on('error', (err) => {
    console.error('Server error:', err);
}); 