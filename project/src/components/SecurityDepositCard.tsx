import { ShoppingCart, DollarSign } from 'lucide-react';

interface SecurityDepositProduct {
  id: string;
  property_id: string;
  deposit_amount: number;
  description: string;
  active: boolean;
}

interface SecurityDepositCardProps {
  product: SecurityDepositProduct;
  propertyName: string;
  onAddToCart: (product: SecurityDepositProduct) => void;
}

export default function SecurityDepositCard({ product, propertyName, onAddToCart }: SecurityDepositCardProps) {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-lg overflow-hidden border-2 border-yellow-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-yellow-400 p-3 rounded-lg">
            <DollarSign className="w-8 h-8 text-yellow-900" />
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-700 font-medium">Security Deposit</p>
            <p className="text-3xl font-bold text-yellow-900">
              ${product.deposit_amount.toFixed(0)}
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{propertyName}</h3>

        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          {product.description}
        </p>

        <div className="bg-white/70 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-700 leading-relaxed">
            This is a <strong>hold only</strong> - the amount will be authorized on your card but not charged unless damages occur. The hold will be automatically released after your stay.
          </p>
        </div>

        <button
          onClick={() => onAddToCart(product)}
          className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Add Security Deposit
        </button>
      </div>
    </div>
  );
}
