// src/features/dispatches/AddressBookView.tsx
import React, { useState, useSyncExternalStore } from 'react';
import { mockStore, AddressBookEntry } from '../../lib/mockData';
import { Search, Plus, Building, User, Landmark, Scale, Phone, Mail, MapPin, X, Check } from 'lucide-react';
import { clock } from '../../lib/clock';

export const AddressBookView: React.FC = () => {
  const addressBook = useSyncExternalStore(
    (cb) => mockStore.subscribe(cb),
    () => mockStore.getAddressBook()
  );

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Address Form State
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<AddressBookEntry['type']>('GOVT_OFFICE');

  const filtered = addressBook.filter((entry) => {
    const org = entry.organization || entry.organisation || '';
    const addr = entry.address || entry.full_address || '';
    const matchesSearch =
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      org.toLowerCase().includes(search.toLowerCase()) ||
      addr.toLowerCase().includes(search.toLowerCase()) ||
      (entry.pin && entry.pin.includes(search));

    const matchesType = typeFilter === 'ALL' || entry.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fullAddress.trim()) {
      alert('Name and Address are required.');
      return;
    }

    mockStore.addAddressBookEntry({
      name: name.trim(),
      organization: organisation.trim() || null,
      organisation: organisation.trim() || null,
      address: fullAddress.trim(),
      full_address: fullAddress.trim(),
      pin: pin.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      type,
    });

    setIsModalOpen(false);
    setName('');
    setOrganisation('');
    setFullAddress('');
    setPin('');
    setPhone('');
    setEmail('');
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'GOVT_OFFICE':
        return <Landmark className="w-4 h-4 text-blue-600" />;
      case 'COURT':
        return <Scale className="w-4 h-4 text-purple-600" />;
      case 'CLIENT':
        return <Building className="w-4 h-4 text-teal-600" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search address book by name, office, PIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Contact Types</option>
            <option value="GOVT_OFFICE">Government Offices</option>
            <option value="COURT">Courts</option>
            <option value="CLIENT">Clients</option>
            <option value="OPPOSITE_PARTY">Opposite Parties</option>
            <option value="VENDOR">Vendors</option>
            <option value="OTHER">Other</option>
          </select>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address</span>
          </button>
        </div>
      </div>

      {/* Grid of Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 transition shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(entry.type)}
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                    {entry.name}
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full shrink-0">
                  {entry.times_used} uses
                </span>
              </div>

              {entry.organisation && (
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {entry.organisation}
                </div>
              )}

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 mt-2">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{entry.full_address} {entry.pin ? `— ${entry.pin}` : ''}</span>
                </div>
                {entry.phone && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{entry.phone}</span>
                  </div>
                )}
                {entry.email && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{entry.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Type: {entry.type.replace('_', ' ')}</span>
              <span>Last used: {entry.last_used ? clock.formatDisplay(entry.last_used) : 'Never'}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          No address book entries found matching your query.
        </div>
      )}

      {/* Add Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Add Address Book Entry
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name / Office Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copyright Office (Registrar)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Organisation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department for Promotion of Industry"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AddressBookEntry['type'])}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="GOVT_OFFICE">Government Office</option>
                  <option value="COURT">Court</option>
                  <option value="CLIENT">Client</option>
                  <option value="OPPOSITE_PARTY">Opposite Party</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Postal Address *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Plot No., Building, Street, City, State..."
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="110078"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="011-28032496"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Address Book</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
