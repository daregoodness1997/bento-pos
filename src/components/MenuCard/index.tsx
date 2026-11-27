import { memo } from 'react';

import { MenuItem, useOrder } from 'context';
import { formatNaira } from 'utils/format';
import { ClockIcon, MinusIcon, PlusIcon } from '../icons';

interface Props {
  item: MenuItem;
}

const MenuCard = memo(({ item }: Props) => {
  const { lines, addItem, setQuantity, portionsFor } = useOrder();
  const quantity = lines.find((line) => line.id === item.id)?.quantity ?? 0;
  const portions = portionsFor(item);
  const canAdd = portions === Infinity || quantity < portions;

  return (
    <article className="menu-card" data-active={quantity > 0}>
      <div className="menu-visual" data-tone={item.tone}>
        <span className="menu-visual__glow" />
        <span className="menu-visual__plate">
          <span />
        </span>
        <span className="menu-card__category">{item.category}</span>
        {item.badge && <span className="menu-card__badge">{item.badge}</span>}
      </div>

      <div className="menu-card__body">
        <div className="menu-card__name-row">
          <h3 className="menu-card__name">{item.name}</h3>
          <span className="menu-card__price">{formatNaira(item.price)}</span>
        </div>

        <span className="menu-card__meta">
          <ClockIcon />
          {item.prepTime > 0 ? `${item.prepTime} min prep` : 'No prep'}
        </span>

        <span className={`portion-count ${portions <= 2 ? 'is-low' : ''}`}>
          {portions === Infinity
            ? 'No stock recipe'
            : `${portions} portions available`}
        </span>

        <div className="menu-card__footer">
          {quantity > 0 ? (
            <div className="card-stepper" aria-label={`${item.name} quantity`}>
              <button
                aria-label={`Remove one ${item.name}`}
                onClick={() => setQuantity(item.id, quantity - 1)}
                type="button"
              >
                <MinusIcon />
              </button>
              <span className="tabular">{quantity}</span>
              <button
                aria-label={`Add one ${item.name}`}
                disabled={!canAdd}
                onClick={() => setQuantity(item.id, quantity + 1)}
                type="button"
              >
                <PlusIcon />
              </button>
            </div>
          ) : (
            <button
              className="card-add"
              disabled={!canAdd}
              onClick={() => addItem(item)}
              type="button"
            >
              {portions === 0 ? 'Out of stock' : 'Add to ticket'}
              <PlusIcon />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

export default MenuCard;
