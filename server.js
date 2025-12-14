// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // to read JSON body

// ---------- PRODUCTS APIs ----------

// Get all products
app.get('/products', (req, res) => {
  pool.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(results);
  });
});

// Add new product
app.post('/products', (req, res) => {
  const { name, price, stock } = req.body;
  pool.query(
    'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
    [name, price, stock],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json({ message: 'Product added', product_id: result.insertId });
    }
  );
});

// Update product
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body;

  pool.query(
    'UPDATE products SET name = ?, price = ?, stock = ? WHERE product_id = ?',
    [name, price, stock, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json({ message: 'Product updated' });
    }
  );
});

// Delete product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  pool.query(
    'DELETE FROM products WHERE product_id = ?',
    [id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json({ message: 'Product deleted' });
    }
  );
});

// ---------- BILLS APIs ----------

// Create a new bill with items & update stock (transaction)
app.post('/bills', (req, res) => {
  const { customer_id, items } = req.body; 
  // items = [{ product_id, quantity }, ...]

  // Get a single connection for transaction
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'DB connection error' });
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        console.error(err);
        return res.status(500).json({ error: 'Transaction error' });
      }

      // 1. Create bill with temporary total_amount = 0
      connection.query(
        'INSERT INTO bills (customer_id, total_amount) VALUES (?, 0)',
        [customer_id],
        (err, billResult) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error(err);
              res.status(500).json({ error: 'Error inserting bill' });
            });
          }

          const billId = billResult.insertId;

          // 2. For each item: get price, calculate item_total, insert into bill_items, reduce stock
          let totalAmount = 0;

          const processNextItem = (index) => {
            if (index >= items.length) {
              // 3. Update total_amount in bill
              connection.query(
                'UPDATE bills SET total_amount = ? WHERE bill_id = ?',
                [totalAmount, billId],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error(err);
                      res.status(500).json({ error: 'Error updating bill total' });
                    });
                  }

                  // 4. Commit transaction
                  connection.commit(err => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error(err);
                        res.status(500).json({ error: 'Commit error' });
                      });
                    }

                    connection.release();
                    res.json({ 
                      message: 'Bill created successfully', 
                      bill_id: billId, 
                      total_amount: totalAmount 
                    });
                  });
                }
              );
              return;
            }

            const item = items[index];
            const { product_id, quantity } = item;

            // get product price & current stock
            connection.query(
              'SELECT price, stock FROM products WHERE product_id = ?',
              [product_id],
              (err, results) => {
                if (err || results.length === 0) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error(err);
                    res.status(500).json({ error: 'Product not found' });
                  });
                }

                const price = results[0].price;
                const stock = results[0].stock;

                if (stock < quantity) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(400).json({ error: 'Not enough stock' });
                  });
                }

                const itemTotal = price * quantity;
                totalAmount += itemTotal;

                // insert into bill_items
                connection.query(
                  'INSERT INTO bill_items (bill_id, product_id, quantity, item_total) VALUES (?, ?, ?, ?)',
                  [billId, product_id, quantity, itemTotal],
                  (err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error(err);
                        res.status(500).json({ error: 'Error inserting bill item' });
                      });
                    }

                    // update product stock
                    connection.query(
                      'UPDATE products SET stock = stock - ? WHERE product_id = ?',
                      [quantity, product_id],
                      (err) => {
                        if (err) {
                          return connection.rollback(() => {
                            connection.release();
                            console.error(err);
                            res.status(500).json({ error: 'Error updating stock' });
                          });
                        }

                        // process next item
                        processNextItem(index + 1);
                      }
                    );
                  }
                );
              }
            );
          };

          processNextItem(0);
        }
      );
    });
  });
});

// Get bill details with items
app.get('/bills/:id', (req, res) => {
  const { id } = req.params;

  const billQuery = `
    SELECT b.bill_id, b.bill_date, b.total_amount, c.name AS customer_name
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.customer_id
    WHERE b.bill_id = ?;
  `;

  const itemsQuery = `
    SELECT bi.item_id, p.name AS product_name, bi.quantity, bi.item_total
    FROM bill_items bi
    JOIN products p ON bi.product_id = p.product_id
    WHERE bi.bill_id = ?;
  `;

  pool.query(billQuery, [id], (err, billRows) => {
    if (err || billRows.length === 0) {
      console.error(err);
      return res.status(500).json({ error: 'Bill not found' });
    }

    pool.query(itemsQuery, [id], (err, itemRows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error fetching items' });
      }

      res.json({
        bill: billRows[0],
        items: itemRows
      });
    });
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Supermarket Billing API running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
