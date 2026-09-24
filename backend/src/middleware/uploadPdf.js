import multer from "multer";

const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            return callback(new Error("Only PDF files are allowed"));
        }

        callback(null, true);
    },
});

export default uploadPdf;
