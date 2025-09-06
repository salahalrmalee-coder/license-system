/**
 * Main script for the Air Traffic License Management System.
 * Handles authentication, routing, and dashboard functionality.
 */
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Authentication Guard: Protect pages before doing anything else.
    handleAuthenticationRouting();

    // 2. Initialize page-specific functionality.
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/')) {
        initLoginPage();
    } else if (path.includes('dashboard.html')) {
        initDashboardPage();
    } else if (path.includes('reports.html')) {
        initReportsPage();
    } else if (path.includes('settings.html')) {
        initSettingsPage();
    }
});

// --- Global state for CRUD operations ---
// Moved to global scope to be accessible by all dashboard functions
let currentAction = null; // 'add' or 'edit'
let selectedRowData = null;
let selectedRowIndex = null;

/**
 * Enables or disables the Edit and Delete buttons based on row selection.
 * @param {boolean} isSelected - True if a row is selected.
 */
function updateCrudButtonStates(isSelected) {
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    if (editBtn && deleteBtn) {
        editBtn.disabled = !isSelected;
        deleteBtn.disabled = !isSelected;
    }
};

/**
 * Redirects the user based on their login status. This acts as a security guard.
 */
function handleAuthenticationRouting() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');

    if (!isLoggedIn && !isLoginPage) {
        // User is NOT logged in and is trying to access a protected page (dashboard).
        // Redirect them to the login page.
        window.location.href = 'index.html';
    }

    if (isLoggedIn && isLoginPage) {
        // User IS logged in but is on the login page.
        // Redirect them to the dashboard.
        window.location.href = 'dashboard.html';
    }
}

/**
 * Sets up all event listeners and functionality for the Login Page.
 */
function initLoginPage() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const workplace = document.getElementById('workplace').value;
            const errorBox = document.getElementById('error');

            // مسح أي رسائل خطأ سابقة
            errorBox.textContent = '';

            // التحقق من أن جميع الحقول مملوءة
            if (!user || !pass || !workplace) {
                errorBox.textContent = 'الرجاء ملء جميع الحقول بما في ذلك مكان العمل.';
                return;
            }

            // IMPORTANT: This is client-side validation and is NOT secure.
            if (user === 'عبدالحميد' && pass === '1984') {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', user);
                localStorage.setItem('workplace', workplace); // حفظ مكان العمل عند الدخول
                window.location.href = 'dashboard.html'; 
            } else {
                errorBox.textContent = 'بيانات الدخول غير صحيحة';
            }
        });
    }
}

/**
 * Sets up all event listeners and functionality for the Dashboard Page.
 */
function initDashboardPage() {
    // Set the active sidebar link
    setActiveSidebarLink();

    // --- Logout Button ---
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // لا يزال تسجيل الدخول يعتمد على localStorage في هذا المثال
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('workplace'); // Clear workplace on logout
            window.location.href = 'index.html';
        });
    }

    // --- Load Data from Server on Page Load ---
    loadDataFromServer();

    updateCrudButtonStates(false); // Initially, buttons are disabled

    // --- Modal and CRUD Button Logic ---
    const modal = document.getElementById('dataModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const modalTitle = document.getElementById('modalTitle');
    const dataForm = document.getElementById('dataForm');

    const openModal = () => modal.style.display = 'block';
    const closeModal = () => modal.style.display = 'none';

    closeModalBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    // --- Add Button ---
    addBtn.addEventListener('click', () => {
        currentAction = 'add';
        modalTitle.textContent = 'إضافة سجل جديد';
        dataForm.innerHTML = '';
        const table = $('#dataTable').DataTable();
        table.columns().header().each(function(header) {
            const col = $(header).text();
            if (col.toLowerCase() === 'ت' || col.toLowerCase().startsWith('empty') || col.toLowerCase().startsWith('__empty')) return;
            const fieldHtml = `<div class="field"><label for="modal_${col}">${col}</label><input class="input" id="modal_${col}" name="${col}" type="text" /></div>`;
            dataForm.insertAdjacentHTML('beforeend', fieldHtml);
        });
        openModal();
    });

    // --- Edit Button ---
    editBtn.addEventListener('click', () => {
        if (!selectedRowData) {
            showNotification('الرجاء تحديد صف لتعديله أولاً.', 'fa-exclamation-triangle');
            return;
        }
        currentAction = 'edit';
        modalTitle.textContent = 'تعديل بيانات السجل';
        dataForm.innerHTML = '';

        Object.keys(selectedRowData).forEach(col => {
            if (col.toLowerCase() === 'ت' || col.toLowerCase() === 'id' || col.toLowerCase().startsWith('empty') || col.toLowerCase().startsWith('__empty')) return;
            
            let value = selectedRowData[col];
            
            // Check if it's a date column and format the value for the input field
            const lowerKey = col.toLowerCase();
            if ((lowerKey.includes('date') || lowerKey.includes('expiry') || lowerKey.includes('تاريخ') || lowerKey.includes('انتهاء'))) {
                const date = excelValueToDate(value);
                if (date) {
                    value = renderDateCell(value, 'display'); // Use the same display format
                }
            }
            
            const fieldHtml = `<div class="field"><label for="modal_${col}">${col}</label><input class="input" id="modal_${col}" name="${col}" type="text" value="${value || ''}" /></div>`;
            dataForm.insertAdjacentHTML('beforeend', fieldHtml);
        });
        openModal();
    });

    // --- Delete Button ---
    deleteBtn.addEventListener('click', () => {
        if (!selectedRowData) {
            showNotification('الرجاء تحديد صف لحذفه أولاً.', 'fa-exclamation-triangle');
            return;
        }

        if (confirm(`هل أنت متأكد من رغبتك في حذف السجل المحدد؟`)) {
            const recordId = selectedRowData.id;
            fetch(`/api/controllers/${recordId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.error) throw new Error(result.error);
                
                let table = $('#dataTable').DataTable();
                table.row('.selected').remove().draw(false);
                
                selectedRowData = null;
                selectedRowIndex = null;
                updateCrudButtonStates(false);
                showNotification('تم حذف السجل بنجاح.', 'fa-check-circle');
            })
            .catch(error => showNotification(`خطأ في الحذف: ${error.message}`, 'fa-exclamation-triangle'));
        }
    });

    // --- Save Button (handles both Add and Edit) ---
    saveBtn.addEventListener('click', () => {
        const formData = new FormData(dataForm);
        const newRowData = {};
        for (const [key, value] of formData.entries()) {
            newRowData[key] = value;
        }

        if (currentAction === 'add') {
            fetch('/api/controllers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRowData)
            })
            .then(res => res.json())
            .then(savedData => {
                if (savedData.error) throw new Error(savedData.error);
                $('#dataTable').DataTable().row.add(savedData).draw(false);
                showNotification('تمت إضافة السجل بنجاح.', 'fa-check-circle');
                closeModal();
            })
            .catch(error => showNotification(`خطأ في الإضافة: ${error.message}`, 'fa-exclamation-triangle'));

        } else if (currentAction === 'edit') {
            const recordId = selectedRowData.id;
            fetch(`/api/controllers/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRowData)
            })
            .then(res => res.json())
            .then(updatedData => {
                if (updatedData.error) throw new Error(updatedData.error);
                $('#dataTable').DataTable().row(selectedRowIndex).data(updatedData).draw(false);
                showNotification('تم تعديل السجل بنجاح.', 'fa-check-circle');
                
                // Deselect row and disable buttons
                $('#dataTable').DataTable().$('tr.selected').removeClass('selected');
                updateCrudButtonStates(false);
                
                closeModal();
            })
            .catch(error => showNotification(`خطأ في التعديل: ${error.message}`, 'fa-exclamation-triangle'));
        }
    });
}

/**
 * Sets up all event listeners and functionality for the Reports Page.
 */
function initReportsPage() {
    setActiveSidebarLink();

    // Fetch data from server to generate reports
    fetch('/api/controllers')
        .then(response => response.json())
        .then(allData => {
            if (allData.error || !allData || allData.length === 0) {
                document.getElementById('reportPlaceholder').innerHTML = '<h2>لا توجد بيانات لعرضها</h2><p>الرجاء استيراد ملف إكسل من الصفحة الرئيسية أولاً.</p>';
                return;
            }
            setupReportButtons(allData);
        })
        .catch(error => document.getElementById('reportPlaceholder').innerHTML = `<h2>خطأ في تحميل البيانات</h2><p>${error.message}</p>`);

    function setupReportButtons(allData) {

    document.getElementById('expiredBtn').addEventListener('click', () => {
        const filteredData = generateLicenseReportData(allData, 'expired');
        displayReportTable(filteredData, 'تقرير التراخيص المنتهية');
    });

    document.getElementById('expiringSoonBtn').addEventListener('click', () => {
        const filteredData = generateLicenseReportData(allData, 'expiringSoon');
        displayReportTable(filteredData, 'تقرير التراخيص التي قاربت على الانتهاء');
    });

    document.getElementById('activeBtn').addEventListener('click', () => {
        const filteredData = generateLicenseReportData(allData, 'active');
        displayReportTable(filteredData, 'تقرير التراخيص السارية');
    });
    }

    // Logout Button Logic
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('workplace'); // Keep login logic for now
            window.location.href = 'index.html';
        });
    }
}

/**
 * Sets up all event listeners and functionality for the Settings Page.
 */
function initSettingsPage() {
    setActiveSidebarLink();

    const modal = document.getElementById('settingsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    const openModal = () => modal.style.display = 'block';
    const closeModal = () => modal.style.display = 'none';

    closeModalBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };

    // Logout Button Logic
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('workplace');
            window.location.href = 'index.html';
        });
    }

    // --- Change Password Button ---
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            modalTitle.textContent = 'تغيير كلمة المرور';
            modalBody.innerHTML = `
                <form id="settingsForm" class="modal-form">
                    <div class="field">
                        <label for="currentPassword">كلمة المرور الحالية</label>
                        <input class="input" id="currentPassword" name="currentPassword" type="password" />
                    </div>
                    <div class="field">
                        <label for="newPassword">كلمة المرور الجديدة</label>
                        <input class="input" id="newPassword" name="newPassword" type="password" />
                    </div>
                    <div class="field">
                        <label for="confirmPassword">تأكيد كلمة المرور الجديدة</label>
                        <input class="input" id="confirmPassword" name="confirmPassword" type="password" />
                    </div>
                </form>
            `;
            openModal();
        });
    }

    // --- Add User Button ---
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            modalTitle.textContent = 'إضافة مستخدم جديد';
            modalBody.innerHTML = `
                <form id="settingsForm" class="modal-form">
                    <div class="field">
                        <label for="newUsername">اسم المستخدم الجديد</label>
                        <input class="input" id="newUsername" name="newUsername" type="text" />
                    </div>
                    <div class="field">
                        <label for="newUserPassword">كلمة المرور</label>
                        <input class="input" id="newUserPassword" name="newUserPassword" type="password" />
                    </div>
                    <div class="permissions-group">
                        <h4>صلاحيات المستخدم</h4>
                        <label><input type="checkbox" name="canViewReports"> الاطلاع على التقارير</label>
                        <label><input type="checkbox" name="canSaveReports"> حفظ التقارير</label>
                        <label><input type="checkbox" name="canUpdateData"> تحديث البيانات (إضافة/تعديل/حذف)</label>
                    </div>
                </form>
            `;
            openModal();
        });
    }

    // --- Remove User Button ---
    const removeUserBtn = document.getElementById('removeUserBtn');
    if (removeUserBtn) {
        removeUserBtn.addEventListener('click', () => {
            modalTitle.textContent = 'إزالة مستخدم';
            modalBody.innerHTML = `
                <form id="settingsForm" class="modal-form">
                    <div class="field">
                        <label for="userToRemove">اسم المستخدم المراد إزالته</label>
                        <input class="input" id="userToRemove" name="userToRemove" type="text" placeholder="اكتب اسم المستخدم هنا..." />
                    </div>
                    <p style="color: var(--danger); font-weight: bold;">تحذير: هذا الإجراء لا يمكن التراجع عنه.</p>
                </form>
            `;
            openModal();
        });
    }

    // --- Save Settings Button (Placeholder) ---
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            showNotification('هذه الميزة تتطلب واجهة خلفية (Backend) لتعمل بشكل آمن.', 'fa-info-circle');
            closeModal();
        });
    }
}

/**
 * Sets up the workplace filter dropdown on the dashboard.
 * It populates the dropdown with unique workplaces from the data and sets up filtering.
 * It also pre-selects the filter based on the user's login choice.
 * @param {Array<Object>} data The full dataset.
 */
function setupWorkplaceFilter(data) {
    const filterSelect = document.getElementById('workplaceFilter');
    const table = $('#dataTable').DataTable();
    if (!filterSelect || !table) return;

    // --- 1. Find the workplace column ---
    // IMPORTANT: We assume the column is named "مكان العمل". Change if needed.
    const workplaceColumnName = "مكان العمل"; 
    let workplaceColumnIndex = -1;

    table.columns().every(function () {
        const header = $(this.header()).text().trim();
        if (header === workplaceColumnName) {
            workplaceColumnIndex = this.index();
        }
    });

    if (workplaceColumnIndex === -1) {
        console.warn(`Filter Warning: Column "${workplaceColumnName}" not found in the table. The workplace filter will be disabled.`);
        if (filterSelect.parentElement) {
            filterSelect.parentElement.style.display = 'none'; // Hide the filter
        }
        return;
    }

    // --- 2. Populate the filter with unique values ---
    const workplaces = table.column(workplaceColumnIndex).data().unique().sort();
    workplaces.each(function (workplace) {
        if (workplace) { // Avoid adding empty options
            filterSelect.add(new Option(workplace, workplace));
        }
    });

    // --- 3. Add event listener for filtering ---
    filterSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        table.column(workplaceColumnIndex).search(selectedValue ? '^' + selectedValue + '$' : '', true, false).draw();
    });

    // --- 4. Auto-apply filter based on login selection ---
    const loggedInWorkplaceValue = localStorage.getItem('workplace');
    if (loggedInWorkplaceValue) {
        const workplaceMap = {
            'hq': 'المقر الرئيسي',
            'tripoli': 'مطار طرابلس الدولي',
            'benghazi': 'مطار بنينا الدولي',
            'misrata': 'مطار مصراتة الدولي'
        };
        const filterText = workplaceMap[loggedInWorkplaceValue];

        if (filterText && workplaces.toArray().includes(filterText)) {
            filterSelect.value = filterText;
            filterSelect.dispatchEvent(new Event('change')); // Trigger the change event to apply filter
            showNotification(`تمت الفلترة تلقائياً حسب: ${filterText}`, 'fa-filter');
        }
    }
}

/**
 * Fetches data from the server and populates the dashboard.
 */
function loadDataFromServer() {
    fetch('/api/controllers')
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            
            // عرض الجدول دائماً، سواء كانت هناك بيانات أم لا
            populateTable(data || []);

            if (data && data.length > 0) {
                updateStatsAndColoring(data);
                setupWorkplaceFilter(data);
                showNotification('تم تحميل البيانات من الخادم بنجاح.');
            }
        })
        .catch(error => {
            console.error("Error loading data from server:", error);
            showNotification(`خطأ في تحميل البيانات: ${error.message}`, 'fa-exclamation-triangle');
        });
}

/**
 * Populates the DataTable with the provided data.
 * @param {Array<Object>} data The array of data objects.
 */
function populateTable(data) {
    if ($.fn.DataTable.isDataTable('#dataTable')) {
        $('#dataTable').DataTable().destroy();
        $('#dataTable').empty();
    }

    // --- الحل: تحديد الأعمدة مسبقاً لعرض الجدول حتى لو كان فارغاً ---
    const predefinedColumns = [
        "الاسم الكامل",
        "تاريخ الميلاد",
        "رقم الرخصة",
        "الأهلية",
        "مكان العمل",
        "ATCO LIC Expiry",
        "Unit Endorsement Expiry",
        "ELP Expiry",
        "MED Expiry"
    ];

    // Remove the 'id' from being displayed as a column
    const hiddenColumns = ['id'];

    // --- تحديد الأعمدة التي سيتم عرضها ---
    // إذا كانت هناك بيانات، نستخدم أعمدتها لضمان المرونة.
    // إذا لم تكن هناك بيانات، نستخدم الأعمدة المحددة مسبقاً.
    const columnKeys = (data && data.length > 0 && data[0]) ? Object.keys(data[0]) : predefinedColumns;

    // 1. إنشاء عمود الترقيم التلقائي أولاً
    const numberingColumn = {
        title: 'ت',
        data: null,
        searchable: false,
        orderable: false,
        className: 'dt-center',
        render: function (data, type, row, meta) {
            return meta.row + 1;
        }
    };

    // 2. جلب أعمدة البيانات من الملف، مع تجاهل عمود الترقيم القديم والأعمدة الفارغة
    let dataColumns = columnKeys
        .filter(key => {
            const lowerKey = key.toLowerCase().trim();
            return lowerKey !== 'id' && lowerKey !== 'ت' && !lowerKey.startsWith('empty') && !lowerKey.startsWith('__empty');
        })
        .map(key => {
            const columnDef = { 
                title: key,
                data: function (row, type, val, meta) {
                    return row.hasOwnProperty(key) ? row[key] : "";
                }
            };
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('date') || lowerKey.includes('expiry') || lowerKey.includes('تاريخ') || lowerKey.includes('انتهاء')) {
                columnDef.render = renderDateCell;
            }
            return columnDef;
        });

    // 3. دمج عمود الترقيم مع أعمدة البيانات
    const finalColumns = [numberingColumn, ...dataColumns];

    $('#dataTable').DataTable({
        data: data,
        columns: finalColumns,
        columnDefs: [
            {
                targets: hiddenColumns, // Hide the 'id' column
                visible: false
            }
        ],
        responsive: true,
        language: { "search": "بحث:", "lengthMenu": "عرض _MENU_ سجلات", "info": "عرض _START_ إلى _END_ من _TOTAL_ سجلات", "infoEmpty": "لا توجد سجلات متاحة", "infoFiltered": "(تمت تصفيته من _MAX_ إجمالي السجلات)", "zeroRecords": "لم يتم العثور على سجلات مطابقة", "paginate": { "first": "الأول", "last": "الأخير", "next": "التالي", "previous": "السابق" } },
        // 'l' = length changing input, 'B' = Buttons, 'f' = filtering input, 'r' = processing display, 't' = table, 'i' = info, 'p' = pagination
        dom: 'lBfrtip', 
        buttons: [
            {
                extend: 'excelHtml5',
                title: 'بيانات التراخيص - وحدة التدريب', // عنوان الملف عند التصدير
                text: '<i class="fas fa-file-excel"></i> حفظ كملف Excel',
                className: 'btn btn-accent', // استخدام نفس تنسيق الأزرار الأخرى
                exportOptions: {
                    columns: ':visible:not(:first-child)' // تصدير كل الأعمدة ما عدا عمود الترقيم الأول
                }
            }
        ]
    });

    // --- الحل: إرفاق حدث تحديد الصف بعد تهيئة الجدول ---
    // هذه هي الطريقة الصحيحة والمضمونة لضمان عمل التحديد
    $('#dataTable tbody').off('click', 'tr').on('click', 'tr', function () {
        const table = $('#dataTable').DataTable();
        if ($(this).hasClass('selected')) {
            // إذا كان الصف المحدد حالياً هو الذي تم النقر عليه، قم بإلغاء تحديده
            $(this).removeClass('selected');
            selectedRowData = null;
            selectedRowIndex = null;
            updateCrudButtonStates(false);
        } else {
            // وإلا، قم بإلغاء تحديد أي صف آخر وحدد هذا الصف
            table.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
            selectedRowData = table.row(this).data();
            selectedRowIndex = table.row(this).index();
            updateCrudButtonStates(true);
        }
    });
}

/**
 * Calculates statistics from the data and updates the dashboard cards.
 * @param {Array<Object>} data The array of data objects.
 */
function updateStatsAndColoring(data) {
    let total = data.length;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonDays = 30;

    // Find all date columns to analyze
    const expiryKeys = [
        "ATCO LIC Expiry",
        "Unit Endorsement Expiry",
        "ELP Expiry",
        "MED Expiry"
    ];

    // --- 1. Calculate Statistics ---
    // يقوم المنطق الجديد بالمرور على كل رخصة في الأعمدة المحددة لكل موظف
    // ويحسب كل رخصة بشكل فردي، بدلاً من تصنيف الموظف بناءً على رخصته الأقرب للانتهاء.
    data.forEach(row => {
        expiryKeys.forEach(key => {
            const dateValue = excelValueToDate(row[key]);
            if (dateValue) { // إذا كانت الخلية تحتوي على تاريخ صالح
                const diffTime = dateValue.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 1) {
                    expired++;
                } else if (diffDays <= soonDays) {
                    expiringSoon++;
                } else {
                    active++;
                }
            }
        });
    });

    // --- 2. Update Stats Cards ---
    $('#totalControllers').text(total);
    $('#activeLicenses').text(active);
    $('#expiringSoonLicenses').text(expiringSoon);
    $('#expiredLicenses').text(expired);

    // --- 3. Color Table Cells ---
    const table = $('#dataTable').DataTable();
    table.rows().every(function() {
        const rowNode = this.node();
        const rowData = this.data();

        $('td', rowNode).each(function(colIndex) {
            const column = table.column(colIndex);
            const headerText = $(column.header()).html();

            if (expiryKeys.includes(headerText)) {
                const cellData = rowData[headerText];

                // الشرط الجديد: لا تقم بالتلوين إذا كانت الخلية تحتوي على نصوص وأرقام معاً
                const isPureDateValue = (typeof cellData === 'number') || (typeof cellData === 'string' && !/[a-zA-Z]/.test(cellData));

                if (isPureDateValue) {
                    const expiryDate = excelValueToDate(cellData);
                    if (!expiryDate) return;

                    const diffTime = expiryDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 1) {
                        $(this).addClass('cell-expired');
                    } else if (diffDays <= soonDays) {
                        $(this).addClass('cell-expiring-soon');
                    } else {
                        $(this).addClass('cell-active');
                    }
                }
            }
        });
    });
}

/**
 * Generates a flat list of individual licenses based on their status.
 * @param {Array<Object>} data The full dataset.
 * @param {'expired'|'expiringSoon'|'active'} status The status to filter by.
 * @returns {Array<Object>} A new array of license objects.
 */
function generateLicenseReportData(data, status) {
    const reportData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonDays = 30;

    const expiryKeys = [
        "ATCO LIC Expiry",
        "Unit Endorsement Expiry",
        "ELP Expiry",
        "MED Expiry"
    ];

    data.forEach(employeeRow => {
        expiryKeys.forEach(key => {
            if (employeeRow.hasOwnProperty(key)) {
                const expiryDate = excelValueToDate(employeeRow[key]);
                if (expiryDate) {
                    const diffDays = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let currentStatus = diffDays < 1 ? 'expired' : (diffDays <= soonDays ? 'expiringSoon' : 'active');

                    if (currentStatus === status) {
                        reportData.push({
                            "الاسم الكامل": employeeRow["الاسم الكامل"],
                            "نوع الرخصة": key,
                            "تاريخ الانتهاء": employeeRow[key] // Keep raw value for rendering
                        });
                    }
                }
            }
        });
    });

    return reportData;
}

/**
 * Displays a DataTable specifically for reports, including an export button.
 * @param {Array<Object>} data The data to display.
 * @param {string} reportTitle The title for the report and exported file.
 */
function displayReportTable(data, reportTitle) {
    document.getElementById('reportPlaceholder').style.display = 'none';
    document.getElementById('reportTableContainer').style.display = 'block';

    if ($.fn.DataTable.isDataTable('#reportTable')) {
        $('#reportTable').DataTable().destroy();
        $('#reportTable').empty();
    }

    if (data.length === 0) {
        $('#reportTableContainer').html('<div class="placeholder"><h2>لا توجد بيانات تطابق هذا التقرير</h2></div>');
        return;
    }

    // --- إعداد الخط العربي لملفات PDF ---
    // يجب أن يكون هذا التعريف مطابقاً لاسم الخط داخل ملف vfs_fonts.js
    pdfMake.fonts = {
        Cairo: {
            normal: 'Cairo-Regular.ttf',
            bold: 'Cairo-Regular.ttf',
            italics: 'Cairo-Regular.ttf',
            bolditalics: 'Cairo-Regular.ttf'
        }
    };

    const columns = Object.keys(data[0])
        .filter(key => {
            const lowerKey = key.toLowerCase();
            return !lowerKey.startsWith('__empty');
        }).map(key => {
        const colDef = { 
            title: key, 
            data: key
        };
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('date') || lowerKey.includes('expiry') || lowerKey.includes('تاريخ') || lowerKey.includes('انتهاء')) {
            colDef.render = renderDateCell;
        }
        return colDef;
    });

    $('#reportTable').DataTable({
        data: data,
        columns: columns,
        responsive: true,
        language: { "search": "بحث:", "lengthMenu": "عرض _MENU_ سجلات", "info": "عرض _START_ إلى _END_ من _TOTAL_ سجلات", "infoEmpty": "لا توجد سجلات متاحة", "infoFiltered": "(تمت تصفيته من _MAX_ إجمالي السجلات)", "zeroRecords": "لم يتم العثور على سجلات مطابقة", "paginate": { "first": "الأول", "last": "الأخير", "next": "التالي", "previous": "السابق" }, },
        createdRow: function(row, data, dataIndex) {
            // بما أن التقرير مفلتر مسبقاً، يمكننا تحديد اللون بناءً على عنوان التقرير
            const reportType = reportTitle.includes('المنتهية') ? 'expired' : 
                               reportTitle.includes('قاربت') ? 'expiringSoon' : 'active';
            
            let colorClass = '';
            if (reportType === 'expired') colorClass = 'cell-expired';
            else if (reportType === 'expiringSoon') colorClass = 'cell-expiring-soon';
            else if (reportType === 'active') colorClass = 'cell-active';

            // Iterate over each cell in the row to color it if it's a date
            $('td', row).each(function(colIndex) {
                const table = $('#reportTable').DataTable();
                const column = table.column(colIndex);
                const headerText = $(column.header()).html();

                // تلوين خلية تاريخ الانتهاء فقط
                if (headerText === 'تاريخ الانتهاء') {
                    $(this).addClass(colorClass);
                }
            });
        },
        dom: 'Bfrtip', // 'B' is for Buttons
        buttons: [
            {
                extend: 'excelHtml5',
                title: reportTitle,
                text: '<i class="fas fa-file-excel"></i> حفظ كملف Excel',
                className: 'btn btn-accent'
            },
            {
                extend: 'pdfHtml5',
                title: reportTitle,
                text: '<i class="fas fa-file-pdf"></i> حفظ كملف PDF',
                className: 'btn btn-danger',
                customize: function(doc) {
                    // تطبيق الخط العربي على كامل المستند
                    doc.defaultStyle.font = 'Cairo';
                    
                    // محاذاة النص إلى اليمين
                    doc.content.forEach(function(item) {
                        if (item.table) {
                            item.table.body.forEach(function(row) {
                                row.forEach(function(cell) {
                                    cell.alignment = 'center';
                                });
                            });
                        } else {
                            item.alignment = 'center';
                        }
                    });
                }
            }
        ]
    });
}

/**
 * Displays a temporary notification toast.
 * @param {string} message The message to display.
 * @param {string} iconClass The Font Awesome icon class.
 */
function showNotification(message, iconClass = 'fa-check-circle') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove the toast after a few seconds
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 500);
    }, 3000); // Show for 3 seconds
}

/**
 * Sets the 'active' class on the correct sidebar link based on the current URL.
 */
function setActiveSidebarLink() {
    const currentPage = window.location.pathname;
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (currentPage.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
}

/**
 * Converts an Excel serial number to a JS Date object.
 * Returns null if the value is not a valid Excel date number.
 * @param {*} excelValue The value from the Excel cell (e.g., 45432).
 * @returns {Date|null}
 */
function excelValueToDate(excelValue) {
    // Case 1: It's a number (Excel serial date)
    if (typeof excelValue === 'number' && excelValue > 1) {
        const date = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        return isNaN(utcDate.getTime()) ? null : utcDate;
    }

    // Case 2: It's a string that might be a date or contain a date
    if (typeof excelValue === 'string') {
        // First, try to parse the whole string. This works for "YYYY/MM/DD" from edit forms.
        let date = new Date(excelValue);
        if (!isNaN(date.getTime())) {
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            return utcDate;
        }

        // If that fails, try to extract a date from within the string (e.g., "LEVEL 4 25/12/2024")
        // This regex looks for DD/MM/YYYY or DD-MM-YYYY
        const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
        const match = excelValue.match(dateRegex);
        
        if (match) {
            // match[1] = DD, match[2] = MM, match[3] = YYYY
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);

            if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                date = new Date(Date.UTC(year, month - 1, day));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
    }
    
    return null;
}

/**
 * A reusable renderer for date cells in DataTables.
 * Handles Excel numbers and strings like "LEVEL 4".
 * @param {*} data The cell data.
 * @param {string} type The rendering type.
 * @returns {string} The formatted date or original data.
 */
function renderDateCell(data, type) {
    if (type === 'display' && data) {
        const date = excelValueToDate(data); // محاولة تحويل أي قيمة إلى تاريخ
        if (date) {
            // إذا نجح التحويل، قم بتنسيقه
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
        // إذا لم يكن تاريخاً (مثل "LEVEL 4")، قم بإرجاع النص الأصلي
        if (typeof data === 'string') {
            return data;
        }
    }
    // للأنواع الأخرى أو البيانات الفارغة، أرجعها كما هي أو كسلسلة فارغة
    return data === undefined || data === null ? "" : data;
}
