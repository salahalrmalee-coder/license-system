const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('./database');

// إنشاء تطبيق Express
const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء مجلد uploads إذا لم يكن موجودًا
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// تكوين multer لرفع الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /xlsx|xls/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('الملف يجب أن يكون بصيغة Excel (xlsx أو xls)'));
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// تعديل: خدمة الملفات الثابتة من المجلد الرئيسي للمشروع
// هذا يسمح للخادم بالعثور على index.html, style.css, script.js, etc.
app.use(express.static(__dirname));

// تعريف المسارات (Routes)
app.get('/api/controllers', (req, res) => {
    try {
        const controllers = db.getAllControllers();
        res.json(controllers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/controllers', (req, res) => {
    try {
        // 1. إضافة السجل والحصول على الـ ID الجديد
        const newId = db.addController(req.body);
        // 2. جلب السجل الكامل من قاعدة البيانات باستخدام الـ ID
        const newController = db.getControllerById(newId);
        // 3. إرسال السجل الكامل كاستجابة
        res.status(201).json(newController);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/controllers/:id', (req, res) => {
    try {
        const updated = db.updateController(req.params.id, req.body);
        if (updated) { 
            // بعد التحديث الناجح، قم بجلب السجل المحدث وأرسله
            const updatedController = db.getControllerById(req.params.id);
            res.json(updatedController);
        } else {
            res.status(404).json({ error: 'لم يتم العثور على المراقب الجوي' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/controllers/:id', (req, res) => {
    try {
        const deleted = db.deleteController(req.params.id);
        if (deleted) {
            res.json({ message: 'تم حذف المراقب الجوي بنجاح' });
        } else {
            res.status(404).json({ error: 'لم يتم العثور على المراقب الجوي' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// نقطة نهاية جديدة لمسح جميع البيانات
app.delete('/api/controllers/all', (req, res) => {
    try {
        const changes = db.deleteAllControllers();
        res.json({ 
            success: true, 
            message: `تم حذف جميع السجلات بنجاح. عدد السجلات المحذوفة: ${changes}` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// بدء تشغيل الخادم
app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
    console.log(`رابط التطبيق: http://localhost:${PORT}`);
    console.log(`مسار حفظ الملفات المؤقتة: ${uploadsDir}`);
});
