const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 30002;



const GET_Method_pagesUrlToHTML = {
    "/": (cb)=>{
        fs.readFile("./index.html",(err,data)=>{
            if(err)cb(err,data);
            const str = data.toString("utf-8");
            
            cb(err,str);
        });
    },
    "/components/app-sidenav/index.js":(cb)=>{
        fs.readFile("./components/app-sidenav/index.js",(err,data)=>{
            if(err)cb(err,data);
            const str = data.toString("utf-8");
            
            cb(err,str);
        });
    },
    "/components/app-listbar/index.js":(cb)=>{
        fs.readFile("./components/app-listbar/index.js",(err,data)=>{
            if(err)cb(err,data);
            const str = data.toString("utf-8");
            
            cb(err,str);
        });
    },
    "/assets/css/presets.css":(cb)=>{
        fs.readFile("./assets/css/presets.css",(err,data)=>{
            if(err)cb(err,data);
            const str = data.toString("utf-8");
            
            cb(err,str);
        });
    },
    "/components/app-content/index.js":(cb)=>{
        fs.readFile("./components/app-content/index.js",(err,data)=>{
            if(err)cb(err,data);
            const str = data.toString("utf-8");
            
            cb(err,str);
        });
    },
    "404":()=>{
        return "";
    }
};

http.createServer((req,res)=>{
    const method = req.method;
    const url = req.url;
    console.log({method,url});
    if(method==="GET"){
        const fn = GET_Method_pagesUrlToHTML[url];
        console.log({fn});
        if(!fn){
            // return 404 page
            res.write(GET_Method_pagesUrlToHTML["404"]());
        }else {
            fn((err,page)=>{
                console.log({page});
                res.write(page);
                res.end();
            });
        }
    }
    
}).listen(PORT,()=>{
    console.log("Server running on port: "+PORT);
});