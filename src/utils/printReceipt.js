export const printReceipt = (order, branchName = "Mr. Kukooo") => {
  // Create an iframe to hold the receipt document
  const iframe = document.createElement('iframe');
  
  // Hide the iframe completely
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  
  // Basic date formatting
  const orderDate = new Date(order.timestamp).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Calculate totals
  const subtotal = order.subtotal || order.total_amount;
  const deliveryFee = order.delivery_fee || 0;
  const discount = order.voucher_discount || 0;
  const finalTotal = order.total_amount;

  // Render items
  const itemsHtml = order.items.map(item => {
    const itemPrice = item.totalPricePerUnit || item.price || 0;
    let html = `
      <div class="item-row">
        <div class="item-qty">${item.quantity}x</div>
        <div class="item-name">
          ${item.name} ${item.size ? `(${item.size.name || item.size})` : ''}
          ${item.addons?.length > 0 ? `<div class="item-addons">+ ${item.addons.map(a => a.name).join(', ')}</div>` : ''}
        </div>
        <div class="item-price">Rs.${itemPrice * item.quantity}</div>
      </div>
    `;
    return html;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - Order #${order.order_id}</title>
        <style>
          /* Thermal Printer Optimization */
          @page { 
            size: 80mm auto; /* Enforce 80mm width and auto length for roll paper */
            margin: 0 !important; 
          }
          @media print {
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 5px !important;
              background-color: #fff;
            }
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            width: 80mm;
            max-width: 100%;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          
          .header { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 11px; }
          
          .customer-info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .customer-info p { margin: 2px 0; }
          
          .items { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .item-row { display: flex; margin-bottom: 5px; }
          .item-qty { width: 25px; font-weight: bold; }
          .item-name { flex: 1; padding-right: 5px; }
          .item-addons { font-size: 10px; color: #333; margin-top: 2px; }
          .item-price { width: 60px; text-align: right; }
          
          .totals { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .grand-total { font-size: 14px; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
          
          .footer { text-align: center; font-size: 11px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <h1>Mr. Kukooo</h1>
          <p>Lick the spoons!</p>
          <p>${branchName}</p>
          <p style="margin-top: 5px;">Order #${order.order_id}</p>
          <p>${orderDate}</p>
          <h2 style="margin: 5px 0; font-size: 16px; border: 1px solid #000; display: inline-block; padding: 2px 8px;">
            ${order.order_type.toUpperCase()}
          </h2>
        </div>
        
        <div class="customer-info">
          <p class="font-bold">Customer Details:</p>
          <p>${order.customer_name || 'Walk-in Customer'}</p>
          <p>${order.customer_phone || ''}</p>
          ${order.order_type === 'Delivery' && order.delivery_address ? `<p>${order.delivery_address}</p>` : ''}
          ${order.special_instructions ? `<p style="margin-top: 5px; font-style: italic;">Notes: ${order.special_instructions}</p>` : ''}
        </div>
        
        <div class="items">
          ${itemsHtml}
        </div>
        
        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>Rs. ${subtotal}</span></div>
          ${deliveryFee > 0 ? `<div class="total-row"><span>Delivery Fee:</span><span>Rs. ${deliveryFee}</span></div>` : ''}
          ${discount > 0 ? `<div class="total-row"><span>Discount:</span><span>- Rs. ${discount}</span></div>` : ''}
          <div class="total-row grand-total"><span>TOTAL:</span><span>Rs. ${finalTotal}</span></div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Mr. Kukooo!</p>
          <p>***</p>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for the iframe to fully load before printing
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};

export const saveReceiptImage = (order, branchName = "Mr. Kukooo") => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '300px'; 
    iframe.style.height = '800px'; 
    iframe.style.visibility = 'hidden';
    
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    
    const orderDate = new Date(order.timestamp).toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const subtotal = order.subtotal || order.total_amount;
    const deliveryFee = order.delivery_fee || 0;
    const discount = order.voucher_discount || order.discount_amount || 0;
    const finalTotal = order.total_amount;

    const itemsHtml = order.items.map(item => {
      const itemPrice = item.totalPricePerUnit || item.price || 0;
      return `
        <div class="item-row">
          <div class="item-qty">${item.quantity}x</div>
          <div class="item-name">
            ${item.name} ${item.size ? `(${item.size.name || item.size})` : ''}
            ${item.addons?.length > 0 ? `<div class="item-addons">+ ${item.addons.map(a => a.name).join(', ')}</div>` : ''}
          </div>
          <div class="item-price">Rs.${itemPrice * item.quantity}</div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 14px;
              color: #000;
              background-color: #fff;
              width: 260px;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .header { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 4px 0; font-size: 12px; }
            .customer-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 15px; }
            .customer-info p { margin: 4px 0; }
            .items { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 15px; }
            .item-row { display: flex; margin-bottom: 8px; }
            .item-qty { width: 30px; font-weight: bold; }
            .item-name { flex: 1; padding-right: 5px; }
            .item-addons { font-size: 11px; color: #555; margin-top: 3px; }
            .item-price { width: 70px; text-align: right; }
            .totals { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 15px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .grand-total { font-size: 16px; font-weight: bold; margin-top: 8px; border-top: 1px solid #000; padding-top: 8px; }
            .footer { text-align: center; font-size: 12px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <h1>Mr. Kukooo</h1>
            <p>Lick the spoons!</p>
            <p>${branchName}</p>
            <p style="margin-top: 8px;">Order #${order.order_id}</p>
            <p>${orderDate}</p>
            <h2 style="margin: 8px 0; font-size: 18px; border: 2px solid #000; display: inline-block; padding: 4px 10px;">
              ${(order.order_type || 'Takeaway').toUpperCase()}
            </h2>
          </div>
          <div class="customer-info">
            <p class="font-bold">Customer Details:</p>
            <p>${order.customer_name || 'Walk-in Customer'}</p>
            <p>${order.customer_phone || ''}</p>
            ${order.order_type === 'Delivery' && order.customer_address ? `<p>${order.customer_address}</p>` : ''}
            ${order.special_instructions ? `<p style="margin-top: 8px; font-style: italic;">Notes: ${order.special_instructions}</p>` : ''}
          </div>
          <div class="items">${itemsHtml}</div>
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>Rs. ${subtotal}</span></div>
            ${deliveryFee > 0 ? `<div class="total-row"><span>Delivery Fee:</span><span>Rs. ${deliveryFee}</span></div>` : ''}
            ${discount > 0 ? `<div class="total-row"><span>Discount:</span><span>- Rs. ${discount}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL:</span><span>Rs. ${finalTotal}</span></div>
          </div>
          <div class="footer"><p>Thank you for choosing Mr. Kukooo!</p><p>***</p></div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      import('html2canvas').then(({ default: html2canvas }) => {
        html2canvas(doc.body, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          const link = document.createElement('a');
          link.download = `Receipt_${order.order_id}.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.9);
          link.click();
          document.body.removeChild(iframe);
          resolve();
        }).catch((err) => {
          document.body.removeChild(iframe);
          reject(err);
        });
      }).catch(err => {
        document.body.removeChild(iframe);
        reject(err);
      });
    };
  });
};
