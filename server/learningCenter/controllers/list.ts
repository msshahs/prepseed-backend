import { NextFunction, Response } from 'express';
import { FilterQuery, model, Types } from 'mongoose';
import { Request } from '../../types/Request';
import APIError from '../../helpers/APIError';
import { ResourceBaseDocument } from '../models/ResourceBaseSchema';
import ClientModel from '../../client/client.model';
import UserModel from '../../user/user.model';

export async function myUploads(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { id: userId, role } = req.payload;
		if (typeof req.query.skip !== 'string') {
			next(new APIError('Skip is required'));
			return;
		}
		if (typeof req.query.limit !== 'string') {
			next(new APIError('Limit is required'));
			return;
		}
		const resourceType = req.query.resourceType;
		if (
			typeof resourceType !== 'string' ||
			!['Video', 'ResourceDocument', 'Assignment'].includes(resourceType)
		) {
			next(new APIError('resourceType is required'));
			return;
		}

		const q = req.query.q;
		const skip = parseInt(req.query.skip, 10);
		const limit = parseInt(req.query.limit, 10);
		const query: FilterQuery<ResourceBaseDocument> = {};
		if (role !== 'super') {
			if (!query.$and) {
				query.$and = [];
			}
			// query.$and.push({ createdBy: Types.ObjectId(userId) });
		}
		if (typeof q === 'string' && q.trim()) {
			const or: FilterQuery<ResourceBaseDocument>[] = [];
			const searchQuery = {
				$regex: q,
				$options: 'i',
			};
			// search by id
			if (Types.ObjectId.isValid(q)) {
				or.push({ _id: Types.ObjectId(q) });
			}
			or.push({ title: searchQuery });
			or.push({ 'tags.value': searchQuery });
			or.push({ liveUrl: searchQuery });
			or.push({ embedUrlId: searchQuery });
			if (!query.$and) {
				query.$and = [];
			}
			// @ts-ignore
			query.$and.push({ $or: or });
		}

		try {
			const SelectedModel = model<ResourceBaseDocument>(resourceType);

			let extraQuery: any = {};

			if (role === 'moderator' || role === 'mentor') {
				extraQuery.isArchived = { $ne: true };
				let createdBy = [Types.ObjectId(userId)];
				if (role === 'moderator') {
					const client = await ClientModel.findOne({ moderators: userId }).select(
						'phases'
					);
					const users = await UserModel.find({
						// @ts-ignore
						role: { $in: ['mentor', 'moderator'] },
						'subscriptions.subgroups.phases.phase': { $in: client.phases },
					}).select('_id');
					users.forEach((user) => {
						createdBy.push(Types.ObjectId(user._id));
					});
				}
				query.$and.push({ createdBy: { $in: createdBy } });
			}

			const total = await SelectedModel.countDocuments({
				...query,
				...extraQuery,
			});

			const videos = await SelectedModel.find({ ...query, ...extraQuery })
				.sort({ createdAt: -1, isArchived: 1 })
				.skip(skip)
				.limit(limit)
				.exec();
			res.send({ items: videos, total });
		} catch (error) {
			console.log(error.message);
			res
				.status(500)
				.send({ message: 'Internal server error', error: error.message });
		}
	} catch (e) {
		next(e);
	}
}
