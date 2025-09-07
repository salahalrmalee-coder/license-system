const Database = require('better-sqlite3');
const path = require('path');

// المسار الذي سيتم فيه تخزين البيانات الدائمة
const DATA_DIR = process.env.RENDER_DISK_PATH || __dirname;
const fs = require('fs');
 
// على الخادم، نفترض أن المجلد موجود. محلياً، نقوم بإنشائه إذا لم يكن موجوداً.
if (!process.env.RENDER_DISK_PATH && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true }); // This runs only locally
}

const dbPath = path.join(DATA_DIR, 'licenses.db');

const db = new Database(dbPath, { verbose: console.log });

// --- إنشاء الجداول ---
// هذا الكود يعمل مرة واحدة فقط عند تشغيل التطبيق لأول مرة
const createTables = () => {
    const createControllersTable = `
    CREATE TABLE IF NOT EXISTS controllers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        "الاسم الكامل" TEXT,
        "تاريخ الميلاد" TEXT,
        "رقم الرخصة" TEXT,
        "الأهلية" TEXT,
        "مكان العمل" TEXT,
        "ATCO LIC Expiry" TEXT,
        "Unit Endorsement Expiry" TEXT,
        "ELP Expiry" TEXT,
        "MED Expiry" TEXT
        -- يمكنك إضافة المزيد من الحقول هنا إذا لزم الأمر
    );`;
    db.exec(createControllersTable);
};

createTables();

// --- دوال التعامل مع قاعدة البيانات ---

function getAllControllers() {
    const stmt = db.prepare('SELECT * FROM controllers');
    return stmt.all();
}

function getControllerByLicense(licenseNumber) {
    // نستخدم "رقم الرخصة" كمعرف فريد
    const stmt = db.prepare('SELECT * FROM controllers WHERE "رقم الرخصة" = ?');
    return stmt.get(licenseNumber);
}

function getControllerById(id) {
    const stmt = db.prepare('SELECT * FROM controllers WHERE id = ?');
    return stmt.get(id);
}

function addController(data) {
    // استخراج الأعمدة والقيم من البيانات المدخلة
    const columnsArray = Object.keys(data);
    const valuesArray = Object.values(data);
    
    // الطريقة الصحيحة والآمنة باستخدام '?' كـ placeholders
    const columns = columnsArray.map(col => `"${col}"`).join(', ');
    const placeholders = columnsArray.map(() => '?').join(', ');
    
    const sql = `INSERT INTO controllers (${columns}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    const result = stmt.run(valuesArray);
    return result.lastInsertRowid;
}

function updateController(id, data) {
    // الطريقة الصحيحة والآمنة باستخدام '?' كـ placeholders
    const columnsArray = Object.keys(data);
    const valuesArray = Object.values(data);
    
    const setClause = columnsArray.map(col => `"${col}" = ?`).join(', ');
    
    const sql = `UPDATE controllers SET ${setClause} WHERE id = ?`;
    const stmt = db.prepare(sql);
    // إضافة الـ id في نهاية مصفوفة القيم لشرط WHERE
    const result = stmt.run([...valuesArray, id]);
    return result.changes > 0;
}

function deleteController(id) {
    const stmt = db.prepare('DELETE FROM controllers WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

function deleteAllControllers() {
    const stmt = db.prepare('DELETE FROM controllers');
    const result = stmt.run();
    // إعادة تعيين الترقيم التلقائي (اختياري)
    db.exec("DELETE FROM sqlite_sequence WHERE name='controllers';");
    return result.changes;
}

module.exports = {
    getAllControllers,
    getControllerByLicense, // إضافة الدالة الجديدة للتصدير
    getControllerById,
    addController,
    updateController,
    deleteController,
    deleteAllControllers
};
