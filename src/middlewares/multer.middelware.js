import multer from 'multer';
const storage = multer.diskStorage({

    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, `${Date.now()}-${file.originalname}`)//file ke sath or vi function h sirf (originalname) use krna efficent nahi h
      console.log("Inside multer:")
    }
  })
  
  export const upload = multer({
     storage, 
     limits: { fileSize: 10 * 1024 * 1024 } // 5 MB limit for file uploads
  })