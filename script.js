/**
 * نظام إدارة محل أدوات صحية - النسخة الاحترافية الكاملة
 */

// 1. Storage Manager
const Storage = (() => {
    const KEY = 'sanitary_pro_data';
    return {
        save: (data) => localStorage.setItem(KEY, JSON.stringify(data)),
        load: () => JSON.parse(localStorage.getItem(KEY)),
        export: (data) => {
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `backup_${new Date().toLocaleDateString()}.json`;
            a.click();
        }
    };
})();

// 2. State Manager
const AppState = {
    state: {
        products: [],
        purchases: [],
        suppliers: [],
        clients: [],
        invoices: [],
        expenses: [],
        settings: { lastTab: "dashboard" }
    },
    isDirty: false,

    init() {
        const saved = Storage.load();
        if (saved) this.state = saved;
        this.save();
    },

    save() {
        Storage.save(this.state);
        document.getElementById('status-indicator').innerText = '✅ جميع البيانات محفوظة';
        this.isDirty = false;
    },

    markDirty() {
        this.isDirty = true;
        document.getElementById('status-indicator').innerText = '⚠️ بيانات غير محفوظة';
    }
};

// 3. Products Module
const Products = {
    add(p) {
        AppState.state.products.push({...p, id: Date.now(), qty: Number(p.qty)});
        AppState.save();
    },
    updateQty(name, amount) {
        const p = AppState.state.products.find(x => x.name === name);
        if (p) p.qty = Number(p.qty) + Number(amount);
    }
};

// 4. Suppliers Module
const Suppliers = {
    renderList() {
        const list = AppState.state.suppliers;
        return `
            <button class="btn btn-primary" onclick="Suppliers.showAddForm()">+ إضافة مورد</button>
            <table>
                <thead><tr><th>المورد</th><th>الهاتف</th><th>العنوان</th><th>إجمالي التوريد</th><th>إجراءات</th></tr></thead>
                <tbody>
                    ${list.map((s, i) => {
                        const total = AppState.state.purchases
                            .filter(p => p.supplier === s.name)
                            .reduce((sum, p) => sum + Number(p.total), 0);
                        return `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.address}</td><td>${total} ج.م</td>
                        <td><button class="btn-danger" onclick="Suppliers.delete(${i})">حذف</button></td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    },
    showAddForm() {
        UI.showModal("إضافة مورد جديد", `
            <form id="supplier-form" onsubmit="Suppliers.handleSave(event)">
                <div class="form-group"><label>اسم المورد</label><input id="s_name" required></div>
                <div class="form-group"><label>الهاتف</label><input id="s_phone"></div>
                <div class="form-group"><label>العنوان</label><input id="s_address"></div>
                <button class="btn btn-primary">حفظ</button>
            </form>`);
    },
    handleSave(e) {
        e.preventDefault();
        AppState.state.suppliers.push({
            name: document.getElementById('s_name').value,
            phone: document.getElementById('s_phone').value,
            address: document.getElementById('s_address').value
        });
        AppState.save(); UI.closeModal(); UI.renderTab('suppliers');
    },
    delete(i) { if(confirm('حذف المورد؟')) { AppState.state.suppliers.splice(i,1); AppState.save(); UI.renderTab('suppliers'); } }
};

// 5. Purchases Module (المشتريات - زيادة المخزون)
const Purchases = {
    tempItems: [],
    showForm() {
        this.tempItems = [];
        AppState.markDirty();
        UI.showModal("فاتورة شراء جديدة", `
            <div class="form-group">
                <label>المورد</label>
                <select id="pur_supplier">
                    ${AppState.state.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
                </select>
            </div>
            <div style="background: #f1f5f9; padding: 10px; border-radius: 8px;">
                <div class="form-group"><label>المنتج</label>
                    <input type="text" id="pur_prod_name" list="prod-list" placeholder="اختر أو اكتب اسم منتج جديد">
                    <datalist id="prod-list">${AppState.state.products.map(p => `<option value="${p.name}">`).join('')}</datalist>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px">
                    <div class="form-group"><label>الكمية</label><input type="number" id="pur_qty"></div>
                    <div class="form-group"><label>سعر الشراء</label><input type="number" id="pur_cost"></div>
                </div>
                <button type="button" class="btn btn-primary" onclick="Purchases.addItem()">إضافة للصنف</button>
            </div>
            <table id="pur-temp-table" style="margin-top:10px">
                <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead>
                <tbody></tbody>
            </table>
            <div class="form-group"><label>مصاريف إضافية (نقل/تحميل)</label><input type="number" id="pur_extra" value="0"></div>
            <button class="btn btn-primary" style="width:100%" onclick="Purchases.saveInvoice()">حفظ فاتورة الشراء وتحديث المخزن</button>
        `);
    },
    addItem() {
        const name = document.getElementById('pur_prod_name').value;
        const qty = Number(document.getElementById('pur_qty').value);
        const cost = Number(document.getElementById('pur_cost').value);
        if(!name || !qty) return;
        this.tempItems.push({name, qty, cost});
        this.renderTemp();
    },
    renderTemp() {
        const body = document.querySelector('#pur-temp-table tbody');
        body.innerHTML = this.tempItems.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td>${it.cost}</td></tr>`).join('');
    },
    saveInvoice() {
        if(this.tempItems.length === 0) return;
        const extra = Number(document.getElementById('pur_extra').value);
        const subTotal = this.tempItems.reduce((s, i) => s + (i.qty * i.cost), 0);
        
        const invoice = {
            id: Date.now(),
            supplier: document.getElementById('pur_supplier').value,
            items: [...this.tempItems],
            extraCosts: extra,
            total: subTotal + extra,
            date: new Date().toLocaleDateString()
        };

        // تحديث المخزن
        this.tempItems.forEach(item => {
            let p = AppState.state.products.find(x => x.name === item.name);
            if(p) {
                p.qty += item.qty;
                p.buyPrice = item.cost; // تحديث آخر سعر شراء
            } else {
                Products.add({name: item.name, category: 'عام', buyPrice: item.cost, sellPrice: item.cost * 1.2, qty: item.qty, minQty: 5});
            }
        });

        AppState.state.purchases.push(invoice);
        AppState.save(); UI.closeModal(); UI.renderTab('purchases');
    }
};

// 6. Sales Module (المبيعات - خصم المخزون)
const Sales = {
    tempItems: [],
    showForm() {
        this.tempItems = [];
        UI.showModal("فاتورة بيع", `
            <div class="form-group"><label>العميل</label>
                <select id="sal_client">${AppState.state.clients.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>المنتج</label>
                <select id="sal_prod">${AppState.state.products.map(p => `<option value="${p.name}">${p.name} (المتاح: ${p.qty})</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>الكمية</label><input type="number" id="sal_qty"></div>
            <button class="btn btn-primary" onclick="Sales.addItem()">إضافة</button>
            <table id="sal-temp-table"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead><tbody></tbody></table>
            <button class="btn btn-primary" onclick="Sales.saveInvoice()">إصدار الفاتورة</button>
        `);
    },
    addItem() {
        const name = document.getElementById('sal_prod').value;
        const qty = Number(document.getElementById('sal_qty').value);
        const p = AppState.state.products.find(x => x.name === name);
        if(!p || p.qty < qty) return alert('الكمية غير كافية!');
        this.tempItems.push({name, qty, price: p.sellPrice, buyPrice: p.buyPrice});
        this.renderTemp();
    },
    renderTemp() {
        const body = document.querySelector('#sal-temp-table tbody');
        body.innerHTML = this.tempItems.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td>${it.price}</td></tr>`).join('');
    },
    saveInvoice() {
        const inv = {
            id: Date.now(),
            clientName: document.getElementById('sal_client').value,
            items: [...this.tempItems],
            total: this.tempItems.reduce((s, i) => s + (i.qty * i.price), 0),
            date: new Date().toLocaleDateString()
        };
        // خصم المخزن
        this.tempItems.forEach(it => {
            const p = AppState.state.products.find(x => x.name === it.name);
            p.qty -= it.qty;
        });
        AppState.state.invoices.push(inv);
        AppState.save(); UI.closeModal(); UI.renderTab('sales');
    }
};

// 7. Expenses Module
const Expenses = {
    add(e) {
        e.preventDefault();
        AppState.state.expenses.push({
            type: document.getElementById('ex_type').value,
            amount: Number(document.getElementById('ex_amount').value),
            date: document.getElementById('ex_date').value,
            notes: document.getElementById('ex_notes').value
        });
        AppState.save(); UI.closeModal(); UI.renderTab('expenses');
    }
};

// 8. Reports Module (المحرك المالي)
const Reports = {
    getStats() {
        const sales = AppState.state.invoices.reduce((s, n) => s + Number(n.total), 0);
        const expenses = AppState.state.expenses.reduce((s, n) => s + Number(n.amount), 0);
        
        // حساب التكلفة الحقيقية للبضاعة المباعة لاستخراج الربح
        let costOfGoodsSold = 0;
        AppState.state.invoices.forEach(inv => {
            inv.items.forEach(it => {
                costOfGoodsSold += (it.qty * (it.buyPrice || 0));
            });
        });

        const grossProfit = sales - costOfGoodsSold;
        const netProfit = grossProfit - expenses;

        return { sales, expenses, netProfit, grossProfit };
    }
};

// 9. UI Controller
const UI = {
    showModal(title, html) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); AppState.isDirty = false; },
    
    renderTab(tab) {
        AppState.state.settings.lastTab = tab;
        AppState.save();
        const area = document.getElementById('content-area');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        
        switch(tab) {
            case 'dashboard':
                const s = Reports.getStats();
                area.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card"><h3>إجمالي المبيعات</h3><p>${s.sales} ج.م</p></div>
                        <div class="stat-card" style="border-top-color:var(--danger)"><h3>إجمالي المصروفات</h3><p>${s.expenses} ج.م</p></div>
                        <div class="stat-card" style="border-top-color:var(--accent)"><h3>صافي الربح</h3><p>${s.netProfit} ج.م</p></div>
                    </div>
                    <h3>⚠️ نواقص المخزن</h3>
                    <table>
                        <thead><tr><th>المنتج</th><th>الكمية الحالية</th><th>حد التنبيه</th></tr></thead>
                        <tbody>
                            ${AppState.state.products.filter(p => p.qty <= p.minQty).map(p => 
                                `<tr><td>${p.name}</td><td style="color:red"><b>${p.qty}</b></td><td>${p.minQty}</td></tr>`).join('')}
                        </tbody>
                    </table>`;
                break;
            case 'products':
                area.innerHTML = `
                    <button class="btn btn-primary" onclick="UI.showProductForm()">+ إضافة منتج يدوي</button>
                    <table>
                        <thead><tr><th>المنتج</th><th>التصنيف</th><th>سعر الشراء</th><th>سعر البيع</th><th>الكمية</th></tr></thead>
                        <tbody>
                            ${AppState.state.products.map(p => `<tr><td>${p.name}</td><td>${p.category}</td><td>${p.buyPrice}</td><td>${p.sellPrice}</td><td>${p.qty}</td></tr>`).join('')}
                        </tbody>
                    </table>`;
                break;
            case 'suppliers': area.innerHTML = Suppliers.renderList(); break;
            case 'purchases': 
                area.innerHTML = `
                <button class="btn btn-primary" onclick="Purchases.showForm()">+ تسجيل فاتورة شراء</button>
                <table>
                    <thead><tr><th>التاريخ</th><th>المورد</th><th>الإجمالي</th><th>بنود</th></tr></thead>
                    <tbody>
                        ${AppState.state.purchases.map(p => `<tr><td>${p.date}</td><td>${p.supplier}</td><td>${p.total}</td><td>${p.items.length} أصناف</td></tr>`).join('')}
                    </tbody>
                </table>`;
                break;
            case 'sales':
                area.innerHTML = `
                <button class="btn btn-primary" onclick="Sales.showForm()">+ فاتورة بيع جديدة</button>
                <table>
                    <thead><tr><th>التاريخ</th><th>العميل</th><th>الإجمالي</th></tr></thead>
                    <tbody>
                        ${AppState.state.invoices.map(inv => `<tr><td>${inv.date}</td><td>${inv.clientName}</td><td>${inv.total}</td></tr>`).join('')}
                    </tbody>
                </table>`;
                break;
            case 'clients':
                area.innerHTML = `
                <button class="btn btn-primary" onclick="UI.showClientForm()">+ إضافة عميل</button>
                <table>
                    <thead><tr><th>الاسم</th><th>الهاتف</th></tr></thead>
                    <tbody>
                        ${AppState.state.clients.map(c => `<tr><td>${c.name}</td><td>${c.phone}</td></tr>`).join('')}
                    </tbody>
                </table>`;
                break;
            case 'expenses':
                area.innerHTML = `
                <button class="btn btn-primary" onclick="UI.showExpenseForm()">+ تسجيل مصروف</button>
                <table>
                    <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
                    <tbody>
                        ${AppState.state.expenses.map(ex => `<tr><td>${ex.date}</td><td>${ex.type}</td><td>${ex.amount}</td><td>${ex.notes}</td></tr>`).join('')}
                    </tbody>
                </table>`;
                break;
            case 'reports':
                const r = Reports.getStats();
                area.innerHTML = `
                    <div class="stat-card" style="max-width:400px">
                        <h3>ملخص مالي شامل</h3>
                        <hr>
                        <p>إجمالي المبيعات: ${r.sales}</p>
                        <p>تكلفة البضاعة: ${r.sales - r.grossProfit}</p>
                        <p style="color:var(--accent)">إجمالي الربح (قبل المصاريف): ${r.grossProfit}</p>
                        <p style="color:var(--danger)">إجمالي المصروفات: ${r.expenses}</p>
                        <hr>
                        <h2 style="color:var(--primary)">الربح الصافي: ${r.netProfit} ج.م</h2>
                    </div>`;
                break;
            case 'settings':
                area.innerHTML = `
                    <h3>إدارة البيانات</h3>
                    <button class="btn btn-primary" onclick="Storage.export(AppState.state)">تصدير نسخة احتياطية (JSON)</button>
                    <p>استيراد بيانات:</p>
                    <input type="file" onchange="UI.importData(event)">
                `;
                break;
        }
    },

    showProductForm() {
        UI.showModal("إضافة منتج", `<form onsubmit="UI.handleProduct(event)">
            <div class="form-group"><label>الاسم</label><input id="p_name" required></div>
            <div class="form-group"><label>سعر الشراء</label><input type="number" id="p_buy" required></div>
            <div class="form-group"><label>سعر البيع</label><input type="number" id="p_sell" required></div>
            <div class="form-group"><label>الكمية</label><input type="number" id="p_qty" required></div>
            <button class="btn btn-primary">حفظ</button>
        </form>`);
    },
    handleProduct(e) {
        e.preventDefault();
        Products.add({
            name: document.getElementById('p_name').value,
            category: 'عام',
            buyPrice: Number(document.getElementById('p_buy').value),
            sellPrice: Number(document.getElementById('p_sell').value),
            qty: Number(document.getElementById('p_qty').value),
            minQty: 5
        });
        UI.closeModal(); UI.renderTab('products');
    },

    showExpenseForm() {
        UI.showModal("تسجيل مصروف", `<form onsubmit="Expenses.add(event)">
            <div class="form-group"><label>النوع</label><input id="ex_type" placeholder="مثلاً: إيجار، كهرباء" required></div>
            <div class="form-group"><label>المبلغ</label><input type="number" id="ex_amount" required></div>
            <div class="form-group"><label>التاريخ</label><input type="date" id="ex_date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>ملاحظات</label><textarea id="ex_notes"></textarea></div>
            <button class="btn btn-primary">حفظ المصروف</button>
        </form>`);
    },

    showClientForm() {
        UI.showModal("إضافة عميل", `<form onsubmit="UI.handleClient(event)">
            <div class="form-group"><label>الاسم</label><input id="cl_name" required></div>
            <div class="form-group"><label>الهاتف</label><input id="cl_phone"></div>
            <button class="btn btn-primary">حفظ</button>
        </form>`);
    },
    handleClient(e) {
        e.preventDefault();
        AppState.state.clients.push({name: document.getElementById('cl_name').value, phone: document.getElementById('cl_phone').value});
        AppState.save(); UI.closeModal(); UI.renderTab('clients');
    },

    importData(e) {
        const reader = new FileReader();
        reader.onload = (event) => {
            AppState.state = JSON.parse(event.target.result);
            AppState.save(); location.reload();
        };
        reader.readAsText(e.target.files[0]);
    }
};

// 10. Initialization & Guards
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.renderTab(AppState.state.settings.lastTab || 'dashboard');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => UI.renderTab(btn.dataset.tab));
    });
});

window.addEventListener('beforeunload', (e) => {
    if (AppState.isDirty) {
        e.preventDefault();
        e.returnValue = 'تنبيه: هناك فاتورة لم يتم حفظها، هل تريد الخروج؟';
    }
});
