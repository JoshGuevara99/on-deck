import { Router } from 'express';
import { z } from 'zod';
import * as venuesService from '../services/venues.service';

export const venuesRouter = Router();

const CreateVenueSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  neighborhood: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/** GET /venues?city=Austin */
venuesRouter.get('/', async (req, res, next) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const venues = await venuesService.listVenues(city);
    res.json(venues);
  } catch (err) {
    next(err);
  }
});

/** GET /venues/:id */
venuesRouter.get('/:id', async (req, res, next) => {
  try {
    const venue = await venuesService.getVenue(req.params.id);
    res.json(venue);
  } catch (err) {
    next(err);
  }
});

/** POST /venues */
venuesRouter.post('/', async (req, res, next) => {
  try {
    const input = CreateVenueSchema.parse(req.body);
    const venue = await venuesService.findOrCreateVenue(input);
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
});
