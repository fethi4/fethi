import track_group_pin from '/images/track_group_pin.svg';
import * as Cesium from "cesium";

let highAltitude = true;

export const onTrackLoad = (tracks, trackGroups) => {
    initializeTrackEntity(tracks);
    initializeTrackGroupEntity(trackGroups);
    zoomToTracks(tracks);
}

const trackPointEntitiyId = (track, index) => {
    return `trackpoint-${track.id}-${index}`;
}
const initializeTrackPointEntities = (track) => {
    let lastPoint = track.times[0];
    track.cartesians.forEach((cartesian, index) => {
        if (track.times[index].diff(lastPoint, 'seconds') < 60) {
            return;
        }
        lastPoint = track.times[index];
        viewer.entities.add({
            id: trackPointEntitiyId(track, index),
            trackid: track.id,
            position: cartesian,
            name: track.pilotname,
            point: {
                pixelSize: 4,
                color: track.color.withAlpha(0.7),
                outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
                outlineWidth: 1,
                scaleByDistance: new Cesium.NearFarScalar(100, 2.5, 100000, 0.3),
            },
            description: `
                    <table>
                        <tr><th>Time</th><td>${track.times[index].format('YYYY-MM-DD HH:mm:ss')}</td></tr>
                        <tr><th>Altitude</th><td>${track.altitudes[index]}m</td></tr>
                    </table>
                `,
        });
    });
};

const tracklineEntitiyId = (track) => {
    return `trackline-${track.id}`;
}
const initializeTrackLineEntity = (track) => {
    viewer.entities.add({
        id: tracklineEntitiyId(track),
        polyline: {
            positions: track.cartesians,
            width: 4,
            material: new Cesium.PolylineOutlineMaterialProperty({
                color: track.color.brighten(0.5, new Cesium.Color()),
                outlineColor: track.color,
                outlineWidth: 2,
            }),
        },
        show: false,
    });
    track.select(false);
};

const initializeTrackEntity = (tracks) => {
    tracks.forEach(track => {
        initializeTrackLineEntity(track);
        initializeTrackPointEntities(track);
    });
}

const trackGroupEntitiyId = (trackGroup) => {
    return `trackgroup-${trackGroup.groupid}`;
}
const initializeTrackGroupEntity = (trackGroups) => {
    const MIN_ICON_SIZE = 30;
    const MAX_ICON_SIZE = 250;
    const COEFFICIENT = (MAX_ICON_SIZE - MIN_ICON_SIZE) / 200;
    trackGroups.forEach(trackGroup => {
        let size = MIN_ICON_SIZE + trackGroup.tracks.length * COEFFICIENT;
        size = size > MAX_ICON_SIZE ? MAX_ICON_SIZE : size;
        viewer.entities.add({
            id: trackGroupEntitiyId(trackGroup),
            position: trackGroup.cartesian,
            groupid: trackGroup.groupid,
            billboard: {
                image: track_group_pin,
                height: size,
                width: size * 5 / 6,
                pixelOffset: new Cesium.Cartesian2(0, -size / 2),
            },
            show: true,
        });
    });
}

const registerEventHandlerOnPointClick = (handleTrackPointClick, handleTrackGroupClick) => {
    // Event handler for clicking on track points
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entityId = pickedObject.id;
            if (entityId instanceof Cesium.Entity) {
                if ('trackid' in entityId) {
                    handleTrackPointClick(entityId.trackid);
                } else if ('groupid' in entityId) {
                    handleTrackGroupClick(entityId.groupid);
                } else {
                    viewer.selectedEntity = undefined;
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

const showTracks = (tracks, filter) => {
    const hidden = [];
    tracks.forEach(track => {
        if (filter.filtersTrack(track)) {
            hidden.push(track);
            return;
        }
        const entity = viewer.entities.getById(tracklineEntitiyId(track));
        entity.show = track.isSelected();
        for (let i = 0; i < track.cartesians.length; i++) {
            const entity = viewer.entities.getById(trackPointEntitiyId(track, i));
            if (entity === undefined) {
                continue;
            }
            entity.show = true;
        }
    });
    hideTracks(hidden);
}
const hideTracks = (tracks) => {
    tracks.forEach(track => {
        const entity = viewer.entities.getById(tracklineEntitiyId(track));
        if (entity === undefined) return;
        entity.show = false;
        for (let i = 0; i < track.cartesians.length; i++) {
            const entity = viewer.entities.getById(trackPointEntitiyId(track, i));
            if (entity === undefined) {
                continue;
            }
            entity.show = false;
        }
    });
}

const showTrackGroups = (trackGroups) => {
    trackGroups.forEach(group => {
        const entity = viewer.entities.getById(trackGroupEntitiyId(group));
        if (entity !== undefined) {
            entity.show = true;
        }
    });
}
const hideTrackGroups = (trackGroups) => {
    trackGroups.forEach(group => {
        const entity = viewer.entities.getById(trackGroupEntitiyId(group));
        if (entity !== undefined) {
            entity.show = false;
        }
    });
}

const isHighAltitude = () => {
    const cameraAltitude = viewer.scene.camera.positionCartographic.height;
    return cameraAltitude > 70000;
}
const hideTimeline = () => {
    const timelineElement = document.querySelector('.cesium-viewer-timelineContainer');
    if (timelineElement) {
        timelineElement.style.display = 'none';
    }
    const animationElement = document.querySelector('.cesium-viewer-animationContainer');
    if (animationElement) {
        animationElement.style.display = 'none';
    }
}

const registerEventListenerOnCameraMove = (tracks, trackGroups, filter) => {
    if (removeCameraMoveEvent !== undefined) {
        removeCameraMoveEvent();
    }
    removeCameraMoveEvent = viewer.camera.changed.addEventListener(() => {
        if (isHighAltitude() == highAltitude) return;
        highAltitude = isHighAltitude();
        render(tracks, trackGroups, filter);
    });
}

const render = (tracks, trackGroups, filter) => {
    if (isHighAltitude()) {
        showTrackGroups(trackGroups);
        hideTracks(tracks);
    } else {
        hideTrackGroups(trackGroups);
        showTracks(tracks, filter);
    }
    hideTimeline();
}

export const ScatterMap = ({onTrackPointClick, onTrackGroupClick, tracks, trackGroups, filter}) => {
    useEffect(() => {
        registerEventHandlerOnPointClick(onTrackPointClick, onTrackGroupClick);
    }, []);
    useEffect(() => {
        registerEventListenerOnCameraMove(tracks, trackGroups, filter);
        render(tracks, trackGroups, filter);
    }, [tracks, trackGroups, filter]);

    return (
        <div ref={cesiumContainerRef} id="scattermap" />
    );
}