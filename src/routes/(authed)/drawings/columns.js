import { createRawSnippet } from 'svelte';
import { renderSnippet } from '$lib/components/ui/data-table/index.js';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableActions from './data-table-actions.svelte';

export const columns = [
	{
		accessorKey: 'title',
		header: 'Title'
	},
	{
		accessorKey: 'isActive',
		header: () => {
			const headerSnippet = createRawSnippet(() => ({
				render: () => `<div class="text-center">Status</div>`
			}));
			return renderSnippet(headerSnippet, '');
		},
		cell: ({ row }) => {
			const isActive = row.getValue('isActive');
			const statusCellSnippet = createRawSnippet((getStatus) => ({
				render: () =>
					`<div class="text-center font-medium ${getStatus() ? 'text-green-600' : 'text-red-600'}">${getStatus() ? 'Active' : 'Inactive'}</div>`
			}));

			return renderSnippet(statusCellSnippet, isActive);
		}
	},
	{
		accessorKey: 'creatorEmail',
		header: 'Created By',
		cell: ({ row }) => {
			const email = row.getValue('creatorEmail');
			const creatorSnippet = createRawSnippet((getEmail) => ({
				render: () => `<div class="text-sm text-gray-500">${getEmail() || 'Unknown'}</div>`
			}));

			return renderSnippet(creatorSnippet, email);
		}
	},
	{
		accessorKey: 'createdAt',
		header: () => {
			const headerSnippet = createRawSnippet(() => ({
				render: () => `<div class="text-center">Created At</div>`
			}));
			return renderSnippet(headerSnippet, '');
		},
		cell: ({ row }) => {
			const date = row.getValue('createdAt');
			const formattedDate = date
				? new Date(date).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})
				: 'N/A';

			const dateCellSnippet = createRawSnippet((getDate) => ({
				render: () => `<div class="text-center">${getDate()}</div>`
			}));

			return renderSnippet(dateCellSnippet, formattedDate);
		}
	},
	{
		accessorKey: 'updatedAt',
		header: () => {
			const headerSnippet = createRawSnippet(() => ({
				render: () => `<div class="text-center">Updated At</div>`
			}));
			return renderSnippet(headerSnippet, '');
		},
		cell: ({ row }) => {
			const date = row.getValue('updatedAt');
			const formattedDate = date
				? new Date(date).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})
				: 'N/A';

			const dateCellSnippet = createRawSnippet((getDate) => ({
				render: () => `<div class="text-center">${getDate()}</div>`
			}));

			return renderSnippet(dateCellSnippet, formattedDate);
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			return renderComponent(DataTableActions, {
				id: row.original.id
			});
		}
	}
];
