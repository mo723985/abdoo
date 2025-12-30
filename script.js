/**
 * نظام إدارة المحل - الإصدار الاحترافي 2.0
 */

// --- حالة التطبيق (Data State) ---
let state = {
    products: [],
    clients: [],
    invoices: []
};

// --- نظام التنقل (Routing) ---
const routing = {
    navigate(sectionId) {
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
        
        document.getElementById(sectionId).classList.add('active');
        document.getElementById(`nav-${sectionId}`).classList.add('active');
        
        this.onSectionLoad(sectionId);
    },
    onSectionLoad(id) {
        if(id === 'dashboard') ui.renderDashboard();
        if(id === 'products') ui.renderProducts();
        if(id === 'clients') ui.renderClients();
        if(id === 'pos') ui.initPOS();
        if(id === 'debts') ui.renderDebts();
        if(id === 'reports') ui.renderReports();
        if(id === 'invoices') ui.renderInvoices(); // ✅ الجديد
    }
};

// --- المنطق البرمجي (App Logic) ---
const app = {
    init() {
        const data = localStorage.getItem('sanitary_ware_db');
        if(data) state = JSON.parse(data);
        routing.navigate('dashboard');
    },

    save() {
        localStorage.setItem('sanitary_ware_db', JSON.stringify(state));
    },

    // إدارة المنتجات
    saveProduct() {
        const id = document.getElementById('p-id').value || Date.now().toString();
        const product = {
            id,
            name: document.getElementById('p-name').value,
            category: document.getElementById('p-cat').value,
            price: parseFloat(document.getElementById('p-price').value) || 0,
            qty: parseInt(document.getElementById('p-qty').value) || 0
        };

        if(!product.name) return alert("الاسم مطلوب");

        const index = state.products.findIndex(p => p.id === id);
        if(index > -1) state.products[index] = product;
        else state.products.push(product);

        this.save();
        ui.closeModal('productModal');
        ui.renderProducts();
    },

    deleteProduct(id) {
        if(!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
        state.products = state.products.filter(p => p.id !== id);
        this.save();
        ui.renderProducts();
    },

    // إدارة العملاء
    saveClient() {
        const id = document.getElementById('c-id').value || Date.now().toString();
        const client = {
            id,
            name: document.getElementById('c-name').value,
            phone: document.getElementById('c-phone').value,
            address: document.getElementById('c-address').value
        };

        const index = state.clients.findIndex(c => c.id === id);
        if(index > -1) state.clients[index] = client;
        else state.clients.push(client);

        this.save();
        ui.closeModal('clientModal');
        ui.renderClients();
    },

    deleteClient(id) {
        if(!confirm("سيتم حذف العميل وكافة سجلاته، متأكد؟")) return;
        state.clients = state.clients.filter(c => c.id !== id);
        state.invoices = state.invoices.filter(inv => inv.clientId !== id);
        this.save();
        ui.renderClients();
    },

    // البيع والفواتير
    cart: [],
    addItemToCart() {
        const pId = document.getElementById('pos-product-select').value;
        const qty = parseInt(document.getElementById('pos-qty').value) || 1;
        const product = state.products.find(p => p.id === pId);

        if(!product || qty > product.qty) return alert("الكمية غير متاحة");

        this.cart.push({
            productId: pId,
            name: product.name,
            price: product.price,
            qty: qty,
            total: product.price * qty
        });
        ui.renderCart();
    },










    
    checkout() {
        const clientId = document.getElementById('pos-client-select').value;
        const paidNow = parseFloat(document.getElementById('pos-paid-now').value) || 0;
        const total = this.cart.reduce((s, i) => s + i.total, 0);

        if(!clientId || this.cart.length === 0) return alert("أكمل بيانات الفاتورة");

        const invoice = {
            id: 'INV-' + Date.now(),
            clientId,
            items: [...this.cart],
            total: total,
            payments: [{
                amount: paidNow,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('ar-EG')
            }],
            date: new Date().toISOString()
        };

        // تحديث المخزن
// خصم المخزون
this.cart.forEach(item => {
    const p = state.products.find(prod => prod.id === item.productId);
    if (p) p.qty -= item.qty;
});

// حفظ الفاتورة
state.invoices.push(invoice);
this.save();

// طباعة مباشرة
printInvoice(invoice.id);

// تفريغ الكارت
this.cart = [];

routing.navigate('dashboard');


    },

    // نظام المديونيات المتطور
    recordPayment() {
        const clientId = document.getElementById('pay-client-id').value;
        const amount = parseFloat(document.getElementById('pay-amount').value);

        if(!amount || amount <= 0) return;

        // إيجاد الفواتير التي بها متبقي لهذا العميل
        let remainingToPay = amount;
        state.invoices.forEach(inv => {
            if(inv.clientId === clientId && remainingToPay > 0) {
                const invPaid = inv.payments.reduce((s, p) => s + p.amount, 0);
                const invDebt = inv.total - invPaid;
                
                if(invDebt > 0) {
                    const pay = Math.min(invDebt, remainingToPay);
                    inv.payments.push({
                        amount: pay,
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString('ar-EG')
                    });
                    remainingToPay -= pay;
                }
            }
        });

        this.save();
        ui.closeModal('paymentModal');
        ui.renderDebts();
    }
};












function printInvoice(invoiceId) {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return alert("الفاتورة غير موجودة");

    const client = state.clients.find(c => c.id === invoice.clientId);

    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - totalPaid;

    let html = `
    <html lang="ar" dir="rtl">
    <head>
        <title>فاتورة ${invoice.id}</title>
        <style>
            body {
                font-family: Arial;
                padding: 25px;
                background: #f8fafc;
            }

            .invoice-box {
                background: white;
                border: 2px dashed #2563eb;
                padding: 20px;
                max-width: 800px;
                margin: auto;
            }

            h2 {
                text-align: center;
                margin: 5px 0;
            }

            h3 {
                text-align: center;
                margin: 5px 0;
                color: #2563eb;
                font-size: 34px;
            }

            .shop-phone {
                text-align: center;
                font-size: 14px;
                margin-bottom: 10px;
            }

            .info {
                display: flex;
                justify-content: space-between;
                margin: 15px 0;
                font-size: 14px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }

            th {
                background: #f1f5f9;
            }

            th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
            }

            .summary {
                margin-top: 15px;
                font-size: 25px;
                border-top: 2px solid #000;
                padding-top: 10px;
            }

            .summary div {
                margin: 6px 0;
                display: flex;
                justify-content: space-between;
            }

            .paid {
                color: #16a34a;
                font-weight: bold;
                font-size: 25px;
            }

            .remain {
                color: #dc2626;
                font-weight: bold;
                font-size: 25px;
            }

            .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 13px;
                color: #555;
            }
        </style>
    </head>
    <body>

    <div class="invoice-box">

        <h2>فاتورة بيع</h2>
        <h3>الحاج محمد عبدالعاطي وأولاده</h3>
        <div class="shop-phone">📞 01203089081</div>

        <div class="info">
            <div><strong>العميل:</strong> ${client?.name || ''}</div>
            <div><strong>التاريخ:</strong> ${new Date(invoice.date).toLocaleDateString('ar-EG')}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>الصنف</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items.map(i => `
                    <tr>
                        <td>${i.name}</td>
                        <td>${i.price}</td>
                        <td>${i.qty}</td>
                        <td>${i.total}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="summary">
            <div>
                <span>إجمالي الفاتورة</span>
                <strong>${invoice.total} ج.م</strong>
            </div>
            <div class="paid">
                <span>المدفوع</span>
                <span>${totalPaid} ج.م</span>
            </div>
            <div class="remain">
                <span>المتبقي</span>
                <span>${remaining} ج.م</span>
            </div>
        </div>

        <div class="footer">
            شكراً لتشريفكم – نتشرف بخدمتكم دائماً 🌹
        </div>

    </div>

    </body>
    </html>
    `;

    const win = window.open('', '', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.print();
}





// --- واجهة المستخدم (UI Renderers) ---
const ui = {
    renderProducts() {
        const body = document.getElementById('products-table-body');
        body.innerHTML = state.products.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${p.price}</td>
                <td>${p.qty}</td>
                <td>
                    <button class="btn-edit" onclick="ui.editProduct('${p.id}')">تعديل</button>
                    <button class="btn-delete" onclick="app.deleteProduct('${p.id}')">حذف</button>
                </td>
            </tr>
        `).join('');
    },

    editProduct(id) {
        const p = state.products.find(x => x.id === id);
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-cat').value = p.category;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-qty').value = p.qty;
        this.openModal('productModal');
    },

    renderClients() {
        const body = document.getElementById('clients-table-body');
        body.innerHTML = state.clients.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.address}</td>
                <td>
                    <button onclick="ui.editClient('${c.id}')">تعديل</button>
                    <button onclick="app.deleteClient('${c.id}')" style="color:red">حذف</button>
                </td>
            </tr>
        `).join('');
    },

    editClient(id) {
        const c = state.clients.find(x => x.id === id);
        document.getElementById('c-id').value = c.id;
        document.getElementById('c-name').value = c.name;
        document.getElementById('c-phone').value = c.phone;
        document.getElementById('c-address').value = c.address;
        this.openModal('clientModal');
    },

    initPOS() {
        const cSel = document.getElementById('pos-client-select');
        const pSel = document.getElementById('pos-product-select');
        
        cSel.innerHTML = '<option value="">-- اختر العميل --</option>' + 
            state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        pSel.innerHTML = state.products.map(p => `<option value="${p.id}">${p.name} (${p.price} ج.م)</option>`).join('');
    },

    renderCart() {
        const body = document.getElementById('cart-table-body');
        let total = 0;
        body.innerHTML = app.cart.map((item, idx) => {
            total += item.total;
            return `<tr><td>${item.name}</td><td>${item.price}</td><td>${item.qty}</td><td>${item.total}</td><td><button onclick="app.cart.splice(${idx},1);ui.renderCart()">X</button></td></tr>`
        }).join('');
        document.getElementById('pos-total').innerText = total.toFixed(2);
    },

    renderDebts() {
        const body = document.getElementById('debts-table-body');
        body.innerHTML = state.clients.map(c => {
            const cInvoices = state.invoices.filter(i => i.clientId === c.id);
            const totalPurchased = cInvoices.reduce((s, i) => s + i.total, 0);
            const totalPaid = cInvoices.reduce((s, i) => s + i.payments.reduce((ss, p) => ss + p.amount, 0), 0);
            const remaining = totalPurchased - totalPaid;

            return `
                <tr>
                    <td>${c.name}</td>
                    <td>${totalPurchased.toFixed(2)}</td>
                    <td>${totalPaid.toFixed(2)}</td>
                    <td style="color:red; font-weight:bold">${remaining.toFixed(2)}</td>
                    <td><button onclick="ui.openPaymentModal('${c.id}', '${c.name}')">تسجيل دفعة</button></td>
                </tr>
            `;
        }).join('');
    },

    openPaymentModal(id, name) {
        document.getElementById('pay-client-id').value = id;
        document.getElementById('pay-client-name').innerText = name;
        this.openModal('paymentModal');
        
        // عرض سجل الدفعات
        const cInvoices = state.invoices.filter(i => i.clientId === id);
        const allPayments = [];
        cInvoices.forEach(inv => allPayments.push(...inv.payments));
        
        document.getElementById('payment-history-list').innerHTML = allPayments.map(p => `
            <div style="font-size: 0.8rem; border-bottom: 1px solid #eee; padding: 5px;">
                ${p.date} - ${p.time} : <strong>${p.amount} ج.م</strong>
            </div>
        `).sort().reverse().join('');
    },

    renderReports() {
        const filterVal = document.getElementById('report-month-filter').value; // YYYY-MM
        const filteredInvoices = state.invoices.filter(inv => inv.date.startsWith(filterVal));

        const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
        let totalPaid = 0;
        filteredInvoices.forEach(inv => {
            totalPaid += inv.payments.reduce((ss, p) => ss + p.amount, 0);
        });

        document.getElementById('rep-total-sales').innerText = totalSales.toFixed(2);
        document.getElementById('rep-total-paid').innerText = totalPaid.toFixed(2);
        document.getElementById('rep-count').innerText = filteredInvoices.length;

        // الأكثر مبيعاً
        const productCounts = {};
        filteredInvoices.forEach(inv => {
            inv.items.forEach(item => {
                productCounts[item.name] = (productCounts[item.name] || 0) + item.qty;
            });
        });

        const sorted = Object.entries(productCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        document.getElementById('rep-best-sellers').innerHTML = sorted.map(s => `<li>${s[0]} (${s[1]} قطعة)</li>`).join('');
    },

    renderDashboard() {
        const totalSales = state.invoices.reduce((s, i) => s + i.total, 0);
        let totalPaid = 0;
        state.invoices.forEach(inv => totalPaid += inv.payments.reduce((ss, p) => ss + p.amount, 0));
        
        document.getElementById('dash-sales').innerText = totalSales.toFixed(2);
        document.getElementById('dash-paid').innerText = totalPaid.toFixed(2);
        document.getElementById('dash-debts').innerText = (totalSales - totalPaid).toFixed(2);
    },

renderInvoices() {
    const body = document.getElementById('invoices-table-body');

    body.innerHTML = state.invoices.map(inv => {
        const client = state.clients.find(c => c.id === inv.clientId);

        return `
        <tr>
            <td>${inv.id}</td>
            <td>${client?.name || ''}</td>
            <td>${new Date(inv.date).toLocaleDateString('ar-EG')}</td>
            <td>${inv.total.toFixed(2)} ج.م</td>
            <td>
<td>
    <button onclick="printInvoice('${inv.id}')">طباعة</button>
    <button onclick="sendInvoice('${inv.id}')">إرسال</button>
</td>

            </td>
        </tr>
        `;
    }).join('');
},


    openModal(id) { document.getElementById(id).style.display = 'block'; },
    closeModal(id) { 
        document.getElementById(id).style.display = 'none'; 
        // مسح الحقول
        const modal = document.getElementById(id);
        modal.querySelectorAll('input').forEach(i => i.value = '');
    }
};







function sendInvoice(invoiceId) {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return alert("الفاتورة غير موجودة");

    const client = state.clients.find(c => c.id === invoice.clientId);
    if (!client || !client.phone) {
        return alert("لا يوجد رقم واتساب لهذا العميل");
    }

    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - paid;

let message = `
 فاتورة بيع رسمية

 الحاج محمد عبدالعاطي وأولاده
   01203089081
━━━━━━━━━━━━━━━━━━

  اسم العميل:  ${client.name}
  التاريخ:  ${new Date(invoice.date).toLocaleDateString('ar-EG')}

  تفاصيل الأصناف: 
`;

invoice.items.forEach((i, index) => {
    message += `
${index + 1}- ${i.name}
   • الكمية: ${i.qty}
   • السعر: ${i.price} ج.م
   • الإجمالي: ${i.total} ج.م
`;
});

message += `
━━━━━━━━━━━━━━━━━━
  ملخص الحساب: 
• إجمالي الفاتورة: ${invoice.total} ج.م
• المبلغ المدفوع: ${paid} ج.م
• المبلغ المتبقي: ${remaining} ج.م

━━━━━━━━━━━━━━━━━━
 نشكركم على التعامل معنا
 في انتظار خدمتكم دائمًا
`;


    const phone = client.phone.replace(/\D/g, '');
    const url = `https://wa.me/20${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
}




// تشغيل النظام
app.init();
