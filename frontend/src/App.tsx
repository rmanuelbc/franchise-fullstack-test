import { useEffect, useState } from 'react';
import { clearAccessToken, franchiseApi, setAccessToken } from './services/api';
import type { Branch, Franchise, Product, TopStockProduct } from '../types/franchise';
import './App.css';

type Screen = 'franchises' | 'branches' | 'products';

export function App() {
  // Data states
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [topStockProducts, setTopStockProducts] = useState<TopStockProduct[]>([]);

  // Form states
  const [newFranchiseName, setNewFranchiseName] = useState('');
  const [editFranchiseName, setEditFranchiseName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [stockDecrementDrafts, setStockDecrementDrafts] = useState<Record<number, string>>({});

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState<Screen>('franchises');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setError(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Load initial franchises
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    franchiseApi
      .getFranchises()
      .then((data) => {
        if (active) setFranchises(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Error loading franchises');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setError('Your session expired. Please sign in again.');
      setSelectedFranchise(null);
      setBranches([]);
      setSelectedBranch(null);
      setProducts([]);
      setTopStockProducts([]);
      setActiveScreen('franchises');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let loginSucceeded = false;
    try {
      const response = await franchiseApi.login(loginUsername, loginPassword);
      setAccessToken(response.accessToken);
      setLoginPassword('');
      setIsAuthenticated(true);
      loginSucceeded = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      if (!loginSucceeded) setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAccessToken();
    setIsAuthenticated(false);
    setFranchises([]);
    setSelectedFranchise(null);
    setBranches([]);
    setSelectedBranch(null);
    setProducts([]);
    setTopStockProducts([]);
    setActiveScreen('franchises');
    setStockDrafts({});
    setStockDecrementDrafts({});
    setError(null);
    setSuccessMsg(null);
  };

  const handleSelectFranchise = async (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    setEditFranchiseName(franchise.name);
    setSelectedBranch(null);
    setBranches([]);
    setProducts([]);
    setTopStockProducts([]);
    setActiveScreen('branches');
    try {
      setLoading(true);
      const branchData = await franchiseApi.getBranches(franchise.id);
      setBranches(branchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading branches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = async (branch: Branch) => {
    setSelectedBranch(branch);
    setEditBranchName(branch.name);
    setEditingProductId(null);
    setEditProductName('');
    setProducts([]);
    setActiveScreen('products');
    try {
      setLoading(true);
      const productData = await franchiseApi.getProducts(branch.id);
      setProducts(productData);
      const drafts: Record<number, string> = {};
      const decrementDrafts: Record<number, string> = {};
      productData.forEach((p) => {
        drafts[p.id] = String(p.stock);
        decrementDrafts[p.id] = '1';
      });
      setStockDrafts(drafts);
      setStockDecrementDrafts(decrementDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading products');
    } finally {
      setLoading(false);
    }
  };

  // Franchise handlers
  const handleCreateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFranchiseName.trim()) return;
    try {
      const created = await franchiseApi.createFranchise(newFranchiseName);
      setFranchises((prev) => [...prev, created]);
      setNewFranchiseName('');
      showSuccess(`Franchise "${created.name}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create franchise');
    }
  };

  const handleUpdateFranchiseName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise || !editFranchiseName.trim()) return;
    try {
      const updated = await franchiseApi.updateFranchiseName(
        selectedFranchise.id,
        editFranchiseName
      );
      setFranchises((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSelectedFranchise(updated);
      showSuccess('Franchise name updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update franchise');
    }
  };

  const handleDeleteFranchise = async () => {
    if (!selectedFranchise) return;
    const confirmed = window.confirm(
      `Delete "${selectedFranchise.name}" and all of its branches and products? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await franchiseApi.deleteFranchise(selectedFranchise.id);
      setFranchises((prev) => prev.filter((franchise) => franchise.id !== selectedFranchise.id));
      setSelectedFranchise(null);
      setActiveScreen('franchises');
      setBranches([]);
      setSelectedBranch(null);
      setProducts([]);
      setTopStockProducts([]);
      setStockDrafts({});
      setStockDecrementDrafts({});
      setNewBranchName('');
      setNewProductName('');
      setNewProductStock('');
      setEditingProductId(null);
      setEditProductName('');
      setEditFranchiseName('');
      setEditBranchName('');
      showSuccess('Franchise and all of its branches and products deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete franchise');
    }
  };

  const handleLoadTopStock = async () => {
    if (!selectedFranchise) return;
    try {
      setLoading(true);
      const data = await franchiseApi.getTopStockProducts(selectedFranchise.id);
      setTopStockProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top stock products');
    } finally {
      setLoading(false);
    }
  };

  // Branch handlers
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchise || !newBranchName.trim()) return;
    try {
      const created = await franchiseApi.createBranch(selectedFranchise.id, newBranchName);
      setBranches((prev) => [...prev, created]);
      setNewBranchName('');
      showSuccess(`Branch "${created.name}" added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  const handleUpdateBranchName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !editBranchName.trim()) return;
    try {
      const updated = await franchiseApi.updateBranchName(selectedBranch.id, editBranchName);
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSelectedBranch(updated);
      showSuccess('Branch name updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branch');
    }
  };

  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;
    const confirmed = window.confirm(
      `Delete "${selectedBranch.name}" and all of its products? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await franchiseApi.deleteBranch(selectedBranch.id);
      setBranches((prev) => prev.filter((branch) => branch.id !== selectedBranch.id));
      setTopStockProducts((prev) =>
        prev.filter((product) => product.branchId !== selectedBranch.id)
      );
      setSelectedBranch(null);
      setActiveScreen('branches');
      setProducts([]);
      setStockDrafts({});
      setStockDecrementDrafts({});
      setNewProductName('');
      setNewProductStock('');
      setEditingProductId(null);
      setEditProductName('');
      setEditBranchName('');
      showSuccess(`Branch "${selectedBranch.name}" and its products deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  // Product handlers
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newProductName.trim() || !newProductStock.trim()) return;

    const stock = Number(newProductStock);
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a whole non-negative number.');
      return;
    }

    try {
      const created = await franchiseApi.createProduct(
        selectedBranch.id,
        newProductName,
        stock
      );
      setProducts((prev) => [...prev, created]);
      setStockDrafts((prev) => ({ ...prev, [created.id]: String(created.stock) }));
      setStockDecrementDrafts((prev) => ({ ...prev, [created.id]: '1' }));
      setNewProductName('');
      setNewProductStock('');
      showSuccess(`Product "${created.name}" added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    }
  };

  const handleUpdateProductName = async (e: React.FormEvent, productId: number) => {
    e.preventDefault();
    const name = editProductName.trim();
    if (name.length < 2) {
      setError('Product name must be at least 2 characters long.');
      return;
    }

    try {
      const updated = await franchiseApi.updateProductName(productId, name);
      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
      setTopStockProducts((prev) =>
        prev.map((product) =>
          product.productId === updated.id ? { ...product, productName: updated.name } : product
        )
      );
      setEditingProductId(null);
      setEditProductName('');
      showSuccess(`Product name updated to "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product name');
    }
  };

  const handleUpdateStock = async (productId: number) => {
    const stockValue = stockDrafts[productId];
    const newStock = Number(stockValue);
    if (
      stockValue === undefined ||
      stockValue.trim() === '' ||
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      setError('Stock must be a whole non-negative number.');
      return;
    }
    try {
      const updated = await franchiseApi.updateProductStock(productId, newStock);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStockDrafts((prev) => ({ ...prev, [updated.id]: String(updated.stock) }));
      showSuccess(`Stock updated for "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    }
  };

  const handleSubtractStock = async (productId: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const currentStock = Number(stockDrafts[productId] ?? product.stock);
    const unitsToSubtract = Number(stockDecrementDrafts[productId] ?? '1');
    if (!Number.isInteger(currentStock) || currentStock < 0) {
      setError('Set a whole non-negative stock value before subtracting units.');
      return;
    }
    if (!Number.isInteger(unitsToSubtract) || unitsToSubtract < 1) {
      setError('Enter a whole number of units to subtract.');
      return;
    }
    if (unitsToSubtract > currentStock) {
      setError('Cannot subtract more units than the current stock.');
      return;
    }

    try {
      const updated = await franchiseApi.updateProductStock(
        productId,
        currentStock - unitsToSubtract
      );
      setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setStockDrafts((prev) => ({ ...prev, [updated.id]: String(updated.stock) }));
      showSuccess(`${unitsToSubtract} unit(s) deducted from "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subtract stock');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!selectedBranch) return;
    try {
      await franchiseApi.deleteProduct(selectedBranch.id, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setTopStockProducts((prev) => prev.filter((product) => product.productId !== productId));
      if (editingProductId === productId) {
        setEditingProductId(null);
        setEditProductName('');
      }
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setStockDecrementDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      showSuccess('Product removed from branch.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={handleLogin}>
          <span className="app-eyebrow">Franchise operations platform</span>
          <h1>Sign in</h1>
          <p>Enter your administrator credentials to manage the franchise network.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button type="button" className="btn-logout" onClick={handleLogout}>
          Sign out
        </button>
        <span className="app-eyebrow">Franchise operations platform</span>
        <h1>Franchise Network Manager</h1>
        <p>
          Bring every franchise, branch, and inventory update into one clear,
          reliable workspace.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {loading && <div className="loading-bar">Loading...</div>}

      <nav className="screen-nav" aria-label="Management screens">
        <button
          type="button"
          className="screen-nav-button"
          data-screen="franchises"
          aria-current={activeScreen === 'franchises' ? 'step' : undefined}
          onClick={() => setActiveScreen('franchises')}
        >
          <span>01</span> Franchises
        </button>
        <button
          type="button"
          className="screen-nav-button"
          data-screen="branches"
          aria-current={activeScreen === 'branches' ? 'step' : undefined}
          disabled={!selectedFranchise}
          onClick={() => setActiveScreen('branches')}
        >
          <span>02</span> Branches
        </button>
        <button
          type="button"
          className="screen-nav-button"
          data-screen="products"
          aria-current={activeScreen === 'products' ? 'step' : undefined}
          disabled={!selectedBranch}
          onClick={() => setActiveScreen('products')}
        >
          <span>03</span> Branch Products
        </button>
      </nav>

      <main className="dashboard-grid dashboard-grid-single">
        <section className="panel panel-franchises" hidden={activeScreen !== 'franchises'}>
          <h2 className="section-heading">
            <span className="section-step">01</span>
            <span className="section-title">Franchises</span>
            <span className="section-category">Network</span>
          </h2>
          <form onSubmit={handleCreateFranchise} className="inline-form">
            <input
              type="text"
              placeholder="New franchise name..."
              value={newFranchiseName}
              onChange={(e) => setNewFranchiseName(e.target.value)}
              required
              minLength={2}
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>

          <ul className="item-list">
            {franchises.map((f, index) => (
              <li
                key={f.id}
                className={selectedFranchise?.id === f.id ? 'selected' : ''}
                onClick={() => handleSelectFranchise(f)}
              >
                <span>{f.name}</span>
                <small>#{index + 1}</small>
              </li>
            ))}
            {franchises.length === 0 && <li className="empty">No franchises yet.</li>}
          </ul>

          {selectedFranchise && (
            <div className="sub-card">
              <h3>Edit Selected Franchise</h3>
              <form onSubmit={handleUpdateFranchiseName} className="inline-form">
                <input
                  type="text"
                  value={editFranchiseName}
                  onChange={(e) => setEditFranchiseName(e.target.value)}
                  required
                  minLength={2}
                />
                <button type="submit" className="btn-secondary">Rename</button>
              </form>

              <button
                type="button"
                className="btn-accent full-width"
                onClick={handleLoadTopStock}
              >
                Show Top-Stock Product per Branch
              </button>

              {topStockProducts.length > 0 && (
                <div className="top-stock-box">
                  <h4>Top Stock by Branch</h4>
                  <ul>
                    {topStockProducts.map((item) => (
                      <li key={`${item.branchId}-${item.productId}`}>
                        <strong>{item.branchName}:</strong> {item.productName} ({item.stock} units)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="danger-zone">
                <p>This also permanently removes all branches and products in this franchise.</p>
                <button
                  type="button"
                  className="btn-danger full-width"
                  onClick={handleDeleteFranchise}
                >
                  Delete Franchise
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel panel-branches" hidden={activeScreen !== 'branches'}>
          <h2 className="section-heading">
            <span className="section-step">02</span>
            <span className="section-title">Branches</span>
            <span className="section-category">Locations</span>
          </h2>
          {!selectedFranchise ? (
            <p className="placeholder">Select a franchise to view or add branches.</p>
          ) : (
            <>
              <p className="context-badge">Franchise: {selectedFranchise.name}</p>
              <form onSubmit={handleCreateBranch} className="inline-form">
                <input
                  type="text"
                  placeholder="New branch name..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                  minLength={2}
                />
                <button type="submit" className="btn-primary">Add</button>
              </form>

              <ul className="item-list">
                {branches.map((b, index) => (
                  <li
                    key={b.id}
                    className={selectedBranch?.id === b.id ? 'selected' : ''}
                    onClick={() => handleSelectBranch(b)}
                  >
                    <span>{b.name}</span>
                    <small>#{index + 1}</small>
                  </li>
                ))}
                {branches.length === 0 && <li className="empty">No branches in this franchise.</li>}
              </ul>

              {selectedBranch && (
                <div className="sub-card">
                  <h3>Edit Selected Branch</h3>
                  <form onSubmit={handleUpdateBranchName} className="inline-form">
                    <input
                      type="text"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      required
                      minLength={2}
                    />
                    <button type="submit" className="btn-secondary">Rename</button>
                  </form>
                  <div className="danger-zone">
                    <p>This also permanently removes all products in this branch.</p>
                    <button
                      type="button"
                      className="btn-danger full-width"
                      onClick={handleDeleteBranch}
                    >
                      Delete Branch
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel panel-products" hidden={activeScreen !== 'products'}>
          <h2 className="section-heading">
            <span className="section-step">03</span>
            <span className="section-title">Branch Products</span>
            <span className="section-category">Inventory</span>
          </h2>
          {!selectedBranch ? (
            <p className="placeholder">Select a branch to manage its products.</p>
          ) : (
            <>
              <p className="context-badge">Branch: {selectedBranch.name}</p>
              <form onSubmit={handleCreateProduct} className="product-form">
                <input
                  type="text"
                  placeholder="Product name..."
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  required
                  minLength={2}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Stock"
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary">Add Product</button>
              </form>

              <ul className="product-list">
                {products.map((p, index) => (
                  <li key={p.id} className="product-item">
                    <div className="product-info">
                      <div className="product-name-heading">
                        <strong>{p.name}</strong>
                        <span>#{index + 1}</span>
                        <button
                          type="button"
                          className="btn-edit-name"
                          onClick={() => {
                            setEditingProductId(p.id);
                            setEditProductName(p.name);
                            setError(null);
                          }}
                        >
                          Rename
                        </button>
                      </div>
                      {editingProductId === p.id && (
                        <form
                          className="product-name-form"
                          onSubmit={(e) => handleUpdateProductName(e, p.id)}
                        >
                          <input
                            type="text"
                            value={editProductName}
                            onChange={(e) => setEditProductName(e.target.value)}
                            aria-label={`New name for ${p.name}`}
                            required
                            minLength={2}
                            autoFocus
                          />
                          <button type="submit" className="btn-secondary">Save name</button>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => {
                              setEditingProductId(null);
                              setEditProductName('');
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="product-actions">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={stockDrafts[p.id] ?? String(p.stock)}
                        onChange={(e) =>
                          setStockDrafts((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleUpdateStock(p.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleDeleteProduct(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="stock-decrease">
                      <label htmlFor={`decrease-stock-${p.id}`}>Units to subtract</label>
                      <input
                        id={`decrease-stock-${p.id}`}
                        type="number"
                        min={1}
                        step={1}
                        value={stockDecrementDrafts[p.id] ?? '1'}
                        onChange={(e) =>
                          setStockDecrementDrafts((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-stock-step"
                        disabled={
                          !Number.isInteger(Number(stockDrafts[p.id] ?? p.stock)) ||
                          Number(stockDrafts[p.id] ?? p.stock) <= 0 ||
                          !Number.isInteger(Number(stockDecrementDrafts[p.id] ?? '1')) ||
                          Number(stockDecrementDrafts[p.id] ?? '1') < 1
                        }
                        onClick={() => handleSubtractStock(p.id)}
                      >
                        Subtract
                      </button>
                    </div>
                  </li>
                ))}
                {products.length === 0 && <li className="empty">No products in this branch.</li>}
              </ul>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
