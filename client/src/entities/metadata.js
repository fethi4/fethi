import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Area } from './area.js';

dayjs.extend(utc);

export class Metadata {
    pilotname = "";
    distance = 0;    // in km
    duration = 0   // in minutes
    maxAltitude = 0;
    startTime = undefined;
    lastTime = undefined;
    startPosition = undefined;
    lastPosition = undefined;
    activity = "";
    model = "";
    area = new Area("", 0, 0, 0);

    getId() {
        return (this.pilotname + '_' + this.lastTime.utc().format('YYYYMMDDHHmmss')).replace(' ', '');
    }

    durationString() {
        const hours = Math.floor(this.duration / 60);
        const minutes = this.duration % 60;
        return hours + 'h ' + minutes + 'm';
    }

    serialize() {
        return {
            pilotname: this.pilotname,
            distance: this.distance,
            duration: this.duration,
            maxAltitude: this.maxAltitude,
            startTime: this.startTime.toISOString(),
            lastTime: this.lastTime.toISOString(),
            startPosition: this.startPosition,
            lastPosition: this.lastPosition,
            activity: this.activity,
            model: this.model,
            area: this.area.serialize(),
        };
    }

    static deserialize(json) {
        const metadata = new Metadata();
        metadata.pilotname = json.pilotname;
        metadata.distance = json.distance;
        metadata.duration = json.duration;
        metadata.maxAltitude = json.maxAltitude;
        metadata.startTime = dayjs(json.startTime);
        metadata.lastTime = dayjs(json.lastTime);
        metadata.startPosition = json.startPosition;
        metadata.lastPosition = json.lastPosition;
        metadata.activity = json.activity;
        metadata.model = json.model;
        metadata.area = Area.deserialize(json.area);
        return metadata;
    }
}