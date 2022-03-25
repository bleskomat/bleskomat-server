/*
	Copyright (C) 2020 Bleskomat s.r.o.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const _ = require('underscore');
const MemoryStore = require('lnurl/lib/stores/memory');

module.exports = function(app) {

	const { config, lnurlServer } = app.custom;

	const title = 'Overview';
	const description = '';

	const getLnurls = function(options) {
		options = _.defaults(options || {}, {
			limit: 10,
			offset: 0,
		});
		try {
			const { store } = lnurlServer;
			let data = [];
			if (store instanceof MemoryStore) {
				// `store.map` is an instance of the Map class.
				store.map.forEach((value, key) => {
					data.push(_.pick(value,
						'tag',
						'params',
						'remainingUses',
						'initialUses',
						'apiKeyId',
						'updatedAt',
					));
				});
				data = data.reverse().slice(options.offset, options.offset + options.limit);
				return Promise.resolve(data);
			} else {
				return store.onReady().then(() => {
					return store.db.select('*')
						.from('urls')
						.orderBy('createdAt', 'desc')
						.limit(options.limit)
						.offset(options.offset);
				});
			}
		} catch (error) {
			Promise.reject(error);
		}
	};

	const countLnurls = function() {
		try {
			const { store } = lnurlServer;
			if (store instanceof MemoryStore) {
				return Promise.resolve(store.map.size);
			} else {
				return store.onReady().then(() => {
					return store.db.count('hash')
						.from('urls')
						.then(results => {
							return parseInt(results && results[0] && results[0].count) || 0
						});
				});
			}
		} catch (error) {
			Promise.reject(error);
		}
	};

	app.get('/admin/overview',
		function(req, res, next) {
			const page = req.query.lnurls && req.query.lnurls.page && parseInt(req.query.lnurls.page) || 1;
			const limit = 10;
			const offset = (page - 1) * limit;
			return countLnurls().then(total => {
				return getLnurls({ limit, offset }).then(lnurls => {
					let tables = {};
					if (lnurls.length > 0) {
						let pagination;
						if (total > limit) {
							const numPages = Math.ceil(total / limit);
							pagination = _.times(numPages, index => {
								const n = index + 1;
								return {
									n,
									label: n,
									current: n === page,
									href: `/admin/overview?lnurls[page]=${n}`,
								};
							});
						}
						tables.lnurls = {
							headers: [
								{ label: 'Type' },
								{ label: 'Amount (msats)' },
								{ label: 'Uses' },
								{ label: 'API Key ID' },
								{ label: 'Datetime' },
							],
							data: _.map(lnurls, item => {
								let amount, type;
								switch (item.tag) {
									case 'withdrawRequest':
										amount = item.params.maxWithdrawable;
										type = 'withdraw';
										break;
								}
								return [
									{ value: type },
									{ value: amount },
									{ value: `${item.remainingUses} / ${item.initialUses}` },
									{ value: item.apiKeyId },
									{ value: item.updatedAt.toString() },
								];
							}),
							pagination,
						};
					}
					if (config.lnurl.auth.apiKeys.length > 0) {
						tables.apiKeys = {
							headers: [
								{ label: 'API Key ID' },
								{ label: 'Last Active' },
								{ label: '' },
								{ label: '' },
							],
							data: _.map(config.lnurl.auth.apiKeys, apiKey => {
								const lastUsedLnurl = _.find(lnurls, item => {
									return item.apiKeyId === apiKey.id;
								});
								return [
									{ value: apiKey.id },
									{ value: lastUsedLnurl && lastUsedLnurl.updatedAt.toString() || '-' },
									{
										button: true,
										href: `/admin/api-keys/${apiKey.id}/delete`,
										className: 'delete',
										title: 'Delete API key',
									},
									{
										button: true,
										href: `/admin/api-keys/${apiKey.id}/download-config`,
										className: 'download',
										title: 'Download configuration file',
									},
								];
							}),
						};
					}
					return res.render('overview', {
						title,
						description,
						apiKeys: tables.apiKeys,
						lnurls: tables.lnurls,
					});
				});
			});
		}
	);
};
