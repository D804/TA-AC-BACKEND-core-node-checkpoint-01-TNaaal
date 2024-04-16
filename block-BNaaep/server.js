const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);
  const pathname = reqUrl.pathname;

  switch (pathname) {
    case '/':
      renderHTML(res, 'index.html');
      break;
    case '/about':
      renderHTML(res, 'about.html');
      break;
    case '/contact':
      if (req.method === 'GET') {
        renderHTML(res, 'contact.html');
      } else if (req.method === 'POST') {
        handleForm(req, res);
      }
      break;
    case '/form':
      if (req.method === 'POST') {
        handleFormSubmission(req, res);
      }
      break;
    case '/users':
      if (req.method === 'GET') {
        if (reqUrl.query.username) {
          getUserByUsername(req, res, reqUrl.query.username);
        } else {
          listAllUsers(res);
        }
      }
      break;
    default:
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - Not Found');
  }
});

function renderHTML(res, page) {
  const filePath = path.join(__dirname, 'templates', page);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 - Internal Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
}

function handleForm(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const formData = parseFormData(body);
    const username = formData.username;
    const contactsDir = path.join(__dirname, 'contacts');
    const fileName = username + '.json';
    const filePath = path.join(contactsDir, fileName);

    fs.open(filePath, 'wx', (err, fd) => {
      if (err) {
        if (err.code === 'EEXIST') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Username already taken');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 - Internal Server Error');
        }
      } else {
        const userData = JSON.stringify(formData);
        fs.writeFile(fd, userData, (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 - Internal Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('Contacts saved');
          }
        });
      }
    });
  });
}

function parseFormData(body) {
  const pairs = body.split('&');
  const formData = {};
  pairs.forEach((pair) => {
    const keyValue = pair.split('=');
    const key = decodeURIComponent(keyValue[0]);
    const value = decodeURIComponent(keyValue[1]);
    formData[key] = value;
  });
  return formData;
}

function getUserByUsername(req, res, username) {
  const fileName = username + '.json';
  const filePath = path.join(__dirname, 'contacts', fileName);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('User not found');
    } else {
      const userData = JSON.parse(data);
      let responseHTML = '<html><body>';
      for (const key in userData) {
        responseHTML += `<p>${key}: ${userData[key]}</p>`;
      }
      responseHTML += '</body></html>';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(responseHTML);
    }
  });
}

function listAllUsers(res) {
  const contactsDir = path.join(__dirname, 'contacts');
  fs.readdir(contactsDir, (err, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 - Internal Server Error');
    } else {
      let responseHTML = '<html><body><h1>User List</h1><ul>';
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          const username = path.basename(file, '.json');
          responseHTML += `<li><a href="/users?username=${username}">${username}</a></li>`;
        }
      });
      responseHTML += '</ul></body></html>';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(responseHTML);
    }
  });
}

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
