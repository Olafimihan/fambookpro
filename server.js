'use strict';
const express = require('express');
// const mysql = require('mysql');

const app = express();

const port = process.env.PORT || 3000;
const cron = require('cron');
const CronJob = require('cron').CronJob;

const bcrypt = require('bcrypt');

const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

const cors = require('cors');
const bodyParser = require('body-parser');

const multer = require('multer');
const path = require('path');

const nodemailer = require('nodemailer');
const mailer = require('./mailer/mailer');
const welcome = require('./mailer/welcomemail');

const pen_service = require('./pen.js');
const doc_Service = require('./doc.js');
const GL_Service = require('./GLServiceCALLs.js');
const production_Service = require('./productionService.js');
const mortality_Service = require('./mortalityService.js');
const sales_Service = require('./sales_Service.js');
const contribution_Service = require('./contribution.js');

const routes = require('./routes.js');

const numeral = require('numeral');

// myLogModule.info('Node.js started');
const urlencodedParser = bodyParser.urlencoded({extended: false});
const http = require('http');
const ejs = require('ejs');

const publicPath = path.join(__dirname, 'public');

const htmlPath = path.join(__dirname, 'views/pages');

console.log(htmlPath)

const socketIO = require('socket.io');
const server = http.createServer(app);

const expressRouter=require('./router')

/** instantiate socket.io here */
const io = socketIO(server);

const fs = require('fs');
const spawn = require('child_process').spawn


/** Database Connections Handle */
const DataBasepool = require('./connection/connection');

// const DataBasetest_pool = require('./connection/testconnection');

const getAlltotal = require('./utilities/getTotalBoardContent');
const dateFormat = require('dateformat');
const { Console } = require('console');
const { connect } = require('http2');
// const { returnStatement } = require('babel-types');
const outResultArray = [];

// ================================================================
// setup our express application
// ================================================================
// app.set('view engine', 'html');
// app.use('public', express.static(process.cwd() + 'public'));
// app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');
// app.set('views', 'pages');


// app.set('views', __dirname);
app.use(express.static(htmlPath));

app.use('/static', express.static(path.join(__dirname,'public')))
app.use('/css', express.static(path.join(__dirname,'public/css')))
// app.use('/lib', express.static(path.join(__dirname,'public/lib')))
app.use('/img', express.static(path.join(__dirname,'public/img')))
app.use('/js', express.static(path.join(__dirname,'public/js')))
app.use('/plugins', express.static(path.join(__dirname,'views/plugins')))
// app.use('/lib', express.static(path.join(__dirname,'views/lib')))

var corsOptions = {
    origin: 'http://127.0.0.1:2021',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.set('socketio', io);
app.use(cors());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DEconstE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __dirname + '/uploads/');
     },
     filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + file.originalname);
        // cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname)
     }
});

let upload = multer({storage: storage});



app.post('/uploadexcelfile', upload.single("excel"), (req, res, next) =>{

    console.log(__dirname + '/uploads/' + req.file.filename)

    importExcelData2MySQL(__dirname + '/uploads/' + req.file.filename);
    
    res.send({
        status: 'File Imported successfully! ', 
        filename: req.file.filename,
        filesize: req.file.size,
        apihost: 'http://treschicpro.online/tressales'

    });
	// res.json({
    //     'msg': 'File uploaded/import successfully!', 'file': req.file
    // });
    
});


// -> Import Excel Data to MySQL database
function importExcelData2MySQL(filePath){
    // File path.
    var count=0;
	readExcelFile(filePath).then((rows) => {
		// `rows` is an array of rows
		// each row being an array of cells.	 
		// console.log('Rows: '+rows.length);
     
        count++;
		/**
		[ [ 'Id', 'Name', 'Address', 'Age' ],
		[ 1, 'Jack Smith', 'Massachusetts', 23 ],
		[ 2, 'Adam Johnson', 'New York', 27 ],
		[ 3, 'Katherin Carter', 'Washington DC', 26 ],
		[ 4, 'Jack London', 'Nevada', 33 ],
		[ 5, 'Jason Bourne', 'California', 36 ] ] 
		*/
	 
		// Remove Header ROW
		rows.shift();
	 
		// Create a connection to the database
		const connection = mysql.createConnection({
			host: 'localhost',
			user: 'root',
			password: 'opeyemi',
			database: 'treschicdb'
        });
        
        DataBasepool.getConnection((err, connection)=>{
            if(err){
                console.log(err);

                return;
            }

            connection.beginTransaction((err)=>{
                if(err){
                    console.log(err)
                    connection.rollback();
                    return
                }

                const query = 'INSERT INTO excel_sock (dated, description, amount) VALUES ?';
                
                connection.query(query, [rows], (err, result)=>{
                    if(err){
                        console.log(err)
                        connection.rollback();
                        return
                    }

                    // console.log(result)
                    connection.commit((err)=>{
                        if(err){
                            console.log(err)
                            connection.rollback();
                            return
                        }
                        connection.release();
                    }) 
                    
                })
            })
        }) 
        
    })
    
    // console.log(count)
}


app.get('/customerslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from customer where token=? order by cust_company_name', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(result);

                    // console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});

app.get('/supplierslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from supplier where token=? order by supplier_company_name', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});

app.get('/penslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from pens where token=? order by pen_name', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});

app.get('/eggslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from goods_table where token=? order by goods_description', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});

app.get('/drugslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from goods where token=? order by description', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});

app.get('/userslist', urlencodedParser, async (req, res) => {
    console.log(req.hostname)
    // console.log(req.api_key)
    const api_key = req.query.api_key;
    console.log(api_key)
    DataBasepool.getConnection((err, connection)=>{
        if(err){
            socket.emit('errmsg', err)
            return
        }
        connection.beginTransaction((err)=>{
            if(err){
                console.log(err);
                res.json({errmsg: err})
                connection.rollback()
                return
            }

            connection.query('select * from webusers where token=? order by fullname', [api_key], (err, result)=>{
                if(err){
                    console.log(err);
                    res.json({errmsg: err})
                    connection.rollback()
                    return
                }
                connection.commit((err)=>{
                    if(err){
                        console.log(err);
                        res.json({errmsg: err})
                        connection.rollback()
                        return
                    }
                    connection.release();

                    console.log(typeof result)
                    res.json({
                        data: result
                    });
                })

            })
        })
    })
});




server.listen(port, function() {
    // console.log('Server listening on port ' + port + '...');
    console.log(`Server listening on port ${port}`)
});

