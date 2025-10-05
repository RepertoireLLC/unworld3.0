import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { VISIBILITY_LAYERS, VisibilityLayer } from '../../types/visibility';
import { ProductDefinition } from '../../types/business';
import { ShieldCheck, Store, Zap } from 'lucide-react';
import { syncCommerceStore } from '../../services/apiClient';

export function CommerceWorkspace() {
  const user = useAuthStore((state) => state.user);
  const initializeForUser = useBusinessStore((state) => state.initializeForUser);
  const updateStoreMeta = useBusinessStore((state) => state.updateStoreMeta);
  const addProduct = useBusinessStore((state) => state.addProduct);
  const removeProduct = useBusinessStore((state) => state.removeProduct);
  const setVisibility = useBusinessStore((state) => state.setVisibility);
  const setPublished = useBusinessStore((state) => state.setPublished);
  const stores = useBusinessStore((state) => state.stores);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<ProductDefinition, 'id'>>({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    paymentLink: '',
    processor: 'stripe',
  });

  useEffect(() => {
    if (user) {
      initializeForUser(user.id);
    }
  }, [initializeForUser, user]);

  const store = useMemo(() => (user ? stores[user.id] : undefined), [stores, user]);

  if (!user || !store) {
    return (
      <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
        <p>Authenticate to configure your commerce capsule.</p>
      </section>
    );
  }

  const handleProductChange = (field: keyof typeof newProduct, value: string) => {
    setNewProduct((prev) => ({
      ...prev,
      [field]: field === 'price' ? Number(value) : value,
    }));
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    const product: ProductDefinition = {
      id: `product_${Date.now()}`,
      ...newProduct,
      price: Number(newProduct.price),
    };
    addProduct(user.id, product);
    setNewProduct({
      name: '',
      description: '',
      price: 0,
      currency: 'USD',
      paymentLink: '',
      processor: 'stripe',
    });
    setStatusMessage('Product drafted locally. Sync to publish.');
  };

  const handlePublish = async (visibility: VisibilityLayer) => {
    const updatedStore = { ...store, visibility, published: true };
    setVisibility(user.id, visibility);
    setPublished(user.id, true);
    setIsSyncing(true);
    try {
      await syncCommerceStore({ ownerId: user.id, store: updatedStore });
      setStatusMessage(`Store synchronized to ${visibility.toUpperCase()} layer.`);
    } catch (error) {
      console.error(error);
      setStatusMessage('Sync failed. Data preserved locally.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
          Commerce Capsule
        </span>
        <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200">
          Modular Web Store
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
          {store.published ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Store Identity</h2>
              <p className="mt-1 text-sm text-white/60">
                Configure your commerce presence. All updates remain encrypted until you choose a visibility layer.
              </p>
            </div>
            <Store className="h-8 w-8 text-emerald-300" />
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Store Name</span>
              <input
                value={store.name}
                onChange={(event) => updateStoreMeta(user.id, { name: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="Enclypse Web Store"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Industry</span>
              <input
                value={store.industry}
                onChange={(event) => updateStoreMeta(user.id, { industry: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="Select industry"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Location</span>
              <input
                value={store.location ?? ''}
                onChange={(event) => updateStoreMeta(user.id, { location: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="City, Country"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Registry Summary</span>
              <textarea
                value={store.registrySummary ?? ''}
                onChange={(event) => updateStoreMeta(user.id, { registrySummary: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="Describe your offering for the public registry"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Description</span>
              <textarea
                value={store.description}
                onChange={(event) => updateStoreMeta(user.id, { description: event.target.value })}
                className="h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="Compose your commerce narrative"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Payment Connectors</h3>
              <p className="mt-1 text-sm text-white/60">Link preferred processors. Enclypse stores only the references.</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-sky-300" />
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Stripe</span>
              <input
                value={store.paymentProviders.stripe ?? ''}
                onChange={(event) => updateStoreMeta(user.id, {
                  paymentProviders: { ...store.paymentProviders, stripe: event.target.value },
                })}
                placeholder="https://checkout.stripe.com/..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">PayPal</span>
              <input
                value={store.paymentProviders.paypal ?? ''}
                onChange={(event) => updateStoreMeta(user.id, {
                  paymentProviders: { ...store.paymentProviders, paypal: event.target.value },
                })}
                placeholder="https://paypal.me/..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Custom Processor</span>
              <input
                value={store.paymentProviders.custom ?? ''}
                onChange={(event) => updateStoreMeta(user.id, {
                  paymentProviders: { ...store.paymentProviders, custom: event.target.value },
                })}
                placeholder="https://your-processor.com/pay"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            <p>
              Connector URLs are encrypted for private and network layers. Public stores expose only registry summaries and product shells.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Product Matrix</h3>
            <p className="mt-1 text-sm text-white/60">Draft product capsules and publish when ready.</p>
          </div>
          <Zap className="h-6 w-6 text-emerald-300" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Name</span>
            <input
              value={newProduct.name}
              onChange={(event) => handleProductChange('name', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              placeholder="Product name"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Price</span>
            <input
              type="number"
              value={newProduct.price}
              onChange={(event) => handleProductChange('price', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              placeholder="0"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Description</span>
            <textarea
              value={newProduct.description}
              onChange={(event) => handleProductChange('description', event.target.value)}
              className="h-20 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              placeholder="Describe the product"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Processor</span>
            <select
              value={newProduct.processor}
              onChange={(event) => handleProductChange('processor', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Payment Link</span>
            <input
              value={newProduct.paymentLink ?? ''}
              onChange={(event) => handleProductChange('paymentLink', event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              placeholder="https://"
            />
          </label>
          <button
            onClick={handleAddProduct}
            className="md:col-span-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Add Product Capsule
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {store.products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No products drafted yet. Add entries to populate your store.
            </div>
          ) : (
            store.products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{product.name}</p>
                  <p className="text-xs text-white/50">{product.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {product.currency} {product.price.toFixed(2)}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 uppercase">
                    {product.processor}
                  </span>
                  <button
                    onClick={() => removeProduct(user.id, product.id)}
                    className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:bg-rose-500/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Visibility Matrix</h3>
            <p className="mt-1 text-sm text-white/60">
              Publish your store to a layer. Private and network tiers remain encrypted in the Enclypse vault.
            </p>
          </div>
          {statusMessage && <p className="text-xs text-emerald-300">{statusMessage}</p>}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {VISIBILITY_LAYERS.map((layer) => (
            <button
              key={layer.value}
              onClick={() => handlePublish(layer.value)}
              disabled={isSyncing}
              className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                store.visibility === layer.value
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-semibold">{layer.label}</p>
              <p className="text-xs text-white/60">{layer.description}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
