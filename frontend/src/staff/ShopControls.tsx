import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MenuResponse, ShopResponse } from '@kape/contract';
import { useState } from 'react';
import { setAcceptingOrders, setItemSoldOut } from '../api/staff';
import { menuQuery, shopQuery } from '../api/queries';
import { staffErrorMessage } from './staffErrors';
import { useStaffCall } from './useStaffCall';

type Notify = (message: string) => void;

/** The banner and button for pausing online orders. Pausing asks twice, because it stops every customer. */
export function PauseOrders({ notify }: { notify: Notify }) {
  const call = useStaffCall();
  const queryClient = useQueryClient();
  const { data: shop } = useQuery({ ...shopQuery, refetchInterval: 15_000 });
  const [asking, setAsking] = useState(false);

  const change = useMutation({
    mutationFn: (accepting: boolean) => call((token) => setAcceptingOrders(token, accepting)),
    onSuccess: ({ acceptingOrders }) => {
      queryClient.setQueryData<ShopResponse>(shopQuery.queryKey, (current) => (current ? { ...current, acceptingOrders } : current));
      setAsking(false);
    },
    onError: (error) => notify(staffErrorMessage(error)),
  });

  if (!shop) return null;

  if (!shop.acceptingOrders) {
    return (
      <div className="banner banner-paused" role="status">
        <p>
          <strong>Online orders are paused.</strong> Customers can see the menu but can't order.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => change.mutate(true)} disabled={change.isPending}>
          {change.isPending ? 'Resuming…' : 'Resume orders'}
        </button>
      </div>
    );
  }

  if (!asking) {
    return (
      <button type="button" className="btn btn-quiet" onClick={() => setAsking(true)}>
        Pause online orders
      </button>
    );
  }

  return (
    <div className="confirm" role="group" aria-label="Pause online orders?">
      <span>Stop customers ordering?</span>
      <button type="button" className="btn btn-danger" onClick={() => change.mutate(false)} disabled={change.isPending}>
        {change.isPending ? 'Pausing…' : 'Yes, pause'}
      </button>
      <button type="button" className="link-btn" onClick={() => setAsking(false)} disabled={change.isPending}>
        Keep taking orders
      </button>
    </div>
  );
}

/** Every item with a switch for "sold out today", so the bar can stop a drink the moment the milk runs out. */
export function SoldOutPanel({ notify }: { notify: Notify }) {
  const call = useStaffCall();
  const queryClient = useQueryClient();
  const { data: menu } = useQuery({ ...menuQuery, refetchInterval: 30_000 });

  const toggle = useMutation({
    mutationFn: ({ id, isSoldOut }: { id: string; isSoldOut: boolean }) => call((token) => setItemSoldOut(token, id, isSoldOut)),
    onSuccess: ({ id, isSoldOut }) => {
      queryClient.setQueryData<MenuResponse>(menuQuery.queryKey, (current) =>
        current ? { ...current, items: current.items.map((item) => (item.id === id ? { ...item, isSoldOut } : item)) } : current,
      );
    },
    onError: (error) => notify(staffErrorMessage(error)),
  });

  if (!menu) return null;
  const soldOutCount = menu.items.filter((item) => item.isSoldOut).length;

  return (
    <details className="panel">
      <summary>
        Menu
        <span className="panel-count">{soldOutCount === 0 ? 'everything available' : `${soldOutCount} sold out`}</span>
      </summary>
      <div className="panel-body">
        {menu.groups.map((group) => (
          <section key={group.id} aria-label={group.name}>
            <h3>{group.name}</h3>
            <ul>
              {menu.items
                .filter((item) => item.groupId === group.id)
                .map((item) => (
                  <li key={item.id} className={item.isSoldOut ? 'is-out' : undefined}>
                    <span>{item.name}</span>
                    <button
                      type="button"
                      className={item.isSoldOut ? 'btn btn-quiet' : 'btn btn-danger-quiet'}
                      aria-pressed={item.isSoldOut}
                      onClick={() => toggle.mutate({ id: item.id, isSoldOut: !item.isSoldOut })}
                      disabled={toggle.isPending && toggle.variables?.id === item.id}
                    >
                      {item.isSoldOut ? 'Sold out · put back' : 'Mark sold out'}
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
