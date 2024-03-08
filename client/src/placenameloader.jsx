import * as Cesium from "cesium";
import axios from 'axios';
import { useEffect } from 'react';
import * as CesiumMap from './cesiummap';

let lastCameraPosition = undefined;
let removeCameraMoveEvent = undefined;
const PLACENAME_RADIUS = 5;
const PLACENAME_SHOW_DISTANCE = 10000;

const loadPlaceNames = async (longitude, latitude, radius) => {
    const placenamesurl = `${import.meta.env.VITE_API_URL}/placenames?longitude=${longitude}&latitude=${latitude}&radius=${radius}`;
    let response = undefined;
    try {
        response = await axios({ method: "get", url: `${placenamesurl}`, responseType: "json" });
    } catch (error) {
        throw error;
    }
    return new Promise(resolve => resolve(response.data));
}

const placenameLabelId = (placename) => {
    return `${placename.name}_${placename.longitude}_${placename.latitude}`;
}

const displayPlaceNames = (placeNames) => {
    placeNames.forEach(placename => {
        const id = placenameLabelId(placename);
        const entity = CesiumMap.viewer.entities.getById(id);
        if (entity !== undefined) {
            return;
        }
        let text = placename.name;
        text = placename.altitude === 0 ? text : text.concat(` [${placename.altitude}m]`);

        requestAnimationFrame(() => {
            CesiumMap.viewer.entities.add({
                id: placenameLabelId(placename),
                position: Cesium.Cartesian3.fromDegrees(placename.longitude, placename.latitude, placename.altitude),
                label: {
                    text: text,
                    font: '18px sans-serif',
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    pixcelOffset: new Cesium.Cartesian2(0, -20),
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    scaleByDistance: new Cesium.NearFarScalar(100, 1.5, 10000, 0.3),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, PLACENAME_SHOW_DISTANCE),
                    fillColor: Cesium.Color.WHITE,
                }
            })
        });
    });
};

export const registerEventListenerOnCameraMove = () => {
    if (removeCameraMoveEvent !== undefined) {
        removeCameraMoveEvent();
    }
    removeCameraMoveEvent = CesiumMap.viewer.camera.changed.addEventListener(async () => {
        if (CesiumMap.viewer.camera.positionCartographic.height > 10000) {
            return;
        }
        if (lastCameraPosition !== undefined) {
            const geodesic = new Cesium.EllipsoidGeodesic(lastCameraPosition, CesiumMap.viewer.camera.positionCartographic);
            const distance = geodesic.surfaceDistance;
            if (distance < PLACENAME_RADIUS * 1000) {
                return;
            }
        }
        lastCameraPosition = CesiumMap.viewer.camera.positionCartographic;
        const longitude = Cesium.Math.toDegrees(CesiumMap.viewer.camera.positionCartographic.longitude);
        const latitude = Cesium.Math.toDegrees(CesiumMap.viewer.camera.positionCartographic.latitude);
        loadPlaceNames(longitude, latitude, PLACENAME_RADIUS).then(placeNames => {
            displayPlaceNames(placeNames);
        });
    });
}
