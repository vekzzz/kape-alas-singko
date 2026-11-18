import { motion } from 'motion/react';
import { useCart } from '../../cart/useCart';
import { getMenuItem } from '../../data/menu';
import { describeOptions, formatPeso, lineTotal, type CartLine } from '../../lib/pricing';
import { ProductIcon } from '../product-art/ProductIcon';
import { QuantityStepper } from '../ui/QuantityStepper';

type CartLineItemProps = {
  line: CartLine;
  onEdit: () => void;
  onRemove: () => void;
};

export function CartLineItem({ line, onEdit, onRemove }: CartLineItemProps) {
  const { dispatch } = useCart();
  const item = getMenuItem(line.itemId);
  const details = [describeOptions(item, line.options), line.note].filter(Boolean).join(' · ');
  const canEdit = item.group !== 'bakery';

  return (
    <motion.li layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }}>
      <ProductIcon item={item} size={52} />
      <div className="cart-line">
        <div className="row-between">
          <strong>{item.name}</strong>
          <span className="num">{formatPeso(lineTotal(item, line))}</span>
        </div>
        {details && <p className="soft small">{details}</p>}
        <div className="row-between">
          <QuantityStepper
            value={line.quantity}
            min={0}
            onChange={(quantity) => (quantity < 1 ? onRemove() : dispatch({ type: 'setQuantity', id: line.id, quantity }))}
            label={`Quantity of ${item.name}`}
          />
          <span className="line-actions">
            {canEdit && (
              <button type="button" className="text-btn" onClick={onEdit} aria-label={`Change ${item.name}`}>
                Change
              </button>
            )}
            <button type="button" className="text-btn" onClick={onRemove} aria-label={`Remove ${item.name}`}>
              Remove
            </button>
          </span>
        </div>
      </div>
    </motion.li>
  );
}
