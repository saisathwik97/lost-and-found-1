# Lost and Found System

A web application for students to post and manage lost and found items.

## Features

- Student and Admin login
- Post lost/found items with images
- Admin approval system for posts
- View all approved lost and found items
- User information displayed on posts

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm (Node Package Manager)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure MySQL:
   - Make sure MySQL server is running
   - Update the database connection details in `server.js` if needed:
     ```javascript
     const db = mysql.createConnection({
         host: 'localhost',
         user: 'root',
         password: '',
         database: 'lost_and_found'
     });
     ```

4. Create a `public` directory in the project root:
   ```bash
   mkdir public
   ```

## Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Login Credentials

### Admin
- Email: admin@gmail.com
- Password: admin123

### Students
1. Student 1:
   - Email: 23241a05j0@gmail.com
   - Password: 23241a05j0

2. Student 2:
   - Email: 23241a05h7@gmail.com
   - Password: 23241a05h7

## Usage

### For Students
1. Login with student credentials
2. Click "Post Lost/Found Item"
3. Fill in the details and upload an image
4. Submit the form
5. Wait for admin approval

### For Admin
1. Login with admin credentials
2. View pending items
3. Approve or reject items
4. View all approved items

## Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styles
- `script.js` - Frontend JavaScript
- `server.js` - Backend server
- `public/` - Static files and uploads
- `package.json` - Project dependencies

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MySQL
- File Upload: Multer
- Authentication: Basic email/password 