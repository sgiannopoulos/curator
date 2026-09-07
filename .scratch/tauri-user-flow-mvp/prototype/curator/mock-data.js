/* Fictional sample content. Test results are future UI placeholders, not executed tests. */
window.CURATOR_DEMO = {
  workspaces: [
    { id: 'harbor', name: 'harbor-web', path: '~/dev/harbor-web', opened: '2h ago', passing: 5, failing: 2 },
    { id: 'atlas', name: 'atlas-dashboard', path: '~/dev/atlas-dashboard', opened: 'yesterday', passing: 11, failing: 0 },
    { id: 'ledger', name: 'ledger-admin', path: '~/work/ledger/apps/admin', opened: 'Tue', passing: 8, failing: 1 },
    { id: 'postcard', name: 'postcard', path: '~/side/postcard', opened: 'Aug 28', passing: 3, failing: 0 }
  ],
  flows: [
    {
      id: 'flow_04', title: 'Checkout with saved card', status: 'Active', testGroup: 'Failing', testMeta: '1 fail', origin: 'Scan',
      description: 'A returning customer opens their cart and proceeds to checkout. They confirm their saved shipping address, select a saved payment card, and place the order.\n\nAfter the payment succeeds, the customer sees an order confirmation with the order number and total. The cart is emptied, and the order becomes available in their order history.',
      citations: [
        { path: 'src/routes/checkout/+page.ts', start: 42, end: 68, freshness: 'Current', reason: 'The checkout action submits the saved card and shipping address, then directs the customer to the order confirmation.' },
        { path: 'src/lib/orders/create.ts', start: 18, end: 39, freshness: 'Stale', reason: 'Creates an order from the cart and clears the cart after successful payment.' }
      ],
      steps: [
        ['Open the cart as a signed-in customer', '/cart', '0.4s'],
        ['Click the Checkout button', '[data-cta=checkout]', '0.9s'],
        ['Confirm the saved shipping address', 'form#shipping', '1.2s'],
        ['Select the card ending 4242', 'radio#card-4242', '0.6s'],
        ['Click Place order', 'button[type=submit]', '1.1s'],
        ['Wait for the order confirmation page', '/orders/*/confirmation', '10.0s', 'failed'],
        ['Check the order total against the cart', '—', 'skip', 'skipped']
      ]
    },
    { id: 'flow_08', title: 'Invite a teammate', status: 'Active', testGroup: 'Failing', testMeta: '2 fail', origin: 'Scan', description: 'An administrator opens the members page and enters a teammate’s email address. They choose a role and send the invitation.\n\nThe recipient follows the invitation link and joins with the selected role. An expired link explains that a new invitation is needed.', citations: [{ path: 'src/routes/members/invite.ts', start: 17, end: 43, freshness: 'Current', reason: 'Checks administrator permissions and creates an invitation with the selected role.' }] },
    { id: 'flow_01', title: 'Sign up with email', status: 'Active', testGroup: 'Passing', testMeta: '6 · 4.2s', origin: 'Scan', description: 'A visitor enters their name, email address, and password on the sign-up page. Valid details create an account and send a verification email.\n\nThe visitor follows the verification link before continuing to the dashboard.', citations: [{ path: 'src/auth/signup.ts', start: 42, end: 68, freshness: 'Current', reason: 'Validates registration input and sends the verification email.' }] },
    { id: 'flow_02', title: 'Log in and reset password', status: 'Active', testGroup: 'Passing', testMeta: '9 · 7.8s', origin: 'Scan', description: 'A user signs in with their email and password. If they have forgotten the password, they request a reset email, open its time-limited link, and choose a new password.\n\nAn expired link prompts them to request another reset.', citations: [{ path: 'src/auth/reset.ts', start: 28, end: 54, freshness: 'Current', reason: 'Checks reset-token expiry and accepts a replacement password.' }] },
    { id: 'flow_03', title: 'Add item to cart', status: 'Active', testGroup: 'Passing', testMeta: '5 · 3.1s', origin: 'Scan', description: 'A customer selects an available product and adds it to their cart. The cart shows the item, quantity, and updated subtotal.', citations: [{ path: 'src/cart/add.ts', start: 10, end: 31, freshness: 'Current', reason: 'Checks availability and updates the cart quantity.' }] },
    { id: 'flow_05', title: 'Search and filter the catalog', status: 'Active', testGroup: 'Passing', testMeta: '7 · 5.6s', origin: 'Scan', description: 'A customer searches the catalog and narrows results by category and price. Clearing a filter updates the visible results. An empty result set offers a way to clear the filters.', citations: [{ path: 'src/catalog/search.ts', start: 24, end: 47, freshness: 'Current', reason: 'Combines the search query with category and price filters.' }] },
    { id: 'flow_06', title: 'Delete account', status: 'Active', testGroup: 'Passing', testMeta: '6 · 4.9s', origin: 'Scan', description: 'A signed-in user requests account deletion from their account settings. After explicit confirmation, the account is removed and the user is signed out.', citations: [{ path: 'src/account/delete.ts', start: 13, end: 35, freshness: 'Current', reason: 'Requires confirmation before removing the account and ending the session.' }] },
    { id: 'flow_07', title: 'Export report as CSV', status: 'Outdated', testGroup: 'Not run', testMeta: '4 steps', origin: 'Scan', description: 'An administrator exports the currently filtered report as a CSV file. The download contains the displayed records and column names.', citations: [{ path: 'src/reports/routes.ts', start: 9, end: 22, freshness: 'Current', reason: 'The previous CSV export route is no longer registered. The report remains available on screen.' }] }
  ],
  chat: [
    { role: 'user', text: 'Explain what happens after a returning customer places an order with a saved card.' },
    { role: 'agent', text: 'The checkout submits the saved card and shipping address. After payment succeeds, it should show the order confirmation and clear the cart. I found supporting code in checkout and order creation.' },
    { role: 'tool', text: 'read_file · src/routes/checkout/+page.ts', output: 'Input: {"path":"src/routes/checkout/+page.ts"}\n\nFictional tool output:\n42  const order = await createOrder(cart, savedCard);\n43  await clearCart();\n44  redirect(`/orders/${order.id}/confirmation`);' }
  ],
  scans: [
    { id: 'scan_03', date: 'Today, 10:42', effort: 'Standard', outcome: 'Completed', result: '7 Active · 1 Outdated', detail: 'Reviewed every existing User Flow before discovery. One flow was marked Outdated; accepted results were applied immediately.', usage: '18,420 tokens · $0.014' },
    { id: 'scan_02', date: 'Yesterday, 16:18', effort: 'Maximum', outcome: 'Cancelled', result: '3 committed results retained', detail: 'Stopped during discovery. Reviewed 5 existing User Flows. Unfinished: uncommon checkout recovery paths.', usage: 'Unavailable' },
    { id: 'scan_01', date: 'Aug 28, 09:12', effort: 'Standard', outcome: 'Completed', result: '5 User Flows added', detail: 'Initial discovery completed. All generated User Flows included Source Citations.', usage: '12,901 tokens · $0.009' }
  ],
  examples: ['Guest checkout with a new card', 'Apply a promo code at checkout', 'Cancel an order within an hour', 'Sign up, verify email, land on the dashboard']
};
