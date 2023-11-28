import React from "react";
import * as Cesium from "cesium";
import axios from "axios";
import { ControlPanel, scrollToTrack } from "./controlpanel";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs';
import { parseTrackJson } from "./track";
import "./world.css";

const BASE_URL = "http://localhost:3001/";
let viewer = undefined;
let state = undefined;
let setState = undefined;

const initializeCesium = (cesiumContainerRef) => {
    viewer = new Cesium.Viewer(cesiumContainerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        terrainShadows: Cesium.ShadowMode.DISABLED,
    });
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.fog = new Cesium.Fog({
        enabled: true,
        density: 0.0005,
        minimumBrightness: 1.0,
    });
}

const zoomToTracks = (tracks) => {
    let cartesians = new Array();
    if (tracks.length > 0) {
        tracks.forEach(track => cartesians.push(...track.cartesians));
        viewer.camera.flyToBoundingSphere(Cesium.BoundingSphere.fromPoints(cartesians), { duration: 1 });
    }
}

const loadTracks = (state, setState) => {
    const date = state['date'];
    const tracksurl = `${BASE_URL}tracks/${date.format('YYYY-MM-DD')}/`;
    axios({ method: "get", url: tracksurl, responseType: "json" }).then(response => {
        const tracknames = response.data;
        Promise.all(tracknames.map(trackname => {
            return axios.get(`${tracksurl}${trackname}`).then(response => {
                return parseTrackJson(response.data);
            })
        })).then((tracks) => {
            // filter tracks less than 5 minutes
            tracks = tracks.filter(track => track.duration() > 5);
            setState({ tracks: tracks });
            showTracks(tracks);
            zoomToTracks(tracks);
        }).catch(error => {
            console.log(error);
        });
    }).catch(error => {
        console.log(error);
    });
}

const showTracks = (tracks) => {
    viewer.entities.removeAll();
    tracks.forEach(track => {
        showTrackPoints(track);
        showTrack(track);
    });
};

const showTrackPoints = (track) => {
    let lastPoint = track.times[0];
    track.cartesians.forEach((cartesian, index) => {
        if (track.times[index].diff(lastPoint, 'seconds') < 60) {
            return;
        }
        lastPoint = track.times[index];
        viewer.entities.add({
            position: cartesian,
            name: track.pilotname,
            trackid: track.id,
            point: {
                pixelSize: 6,
                color: track.color.withAlpha(0.7),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                scaleByDistance: new Cesium.NearFarScalar(100, 3, 10000, 0.8),
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

const showTrack = (track) => {
    if (!track.show) {
        return
    }
    viewer.entities.add({
        polyline: {
            positions: track.cartesians,
            width: 3,
            material: track.color,
        },
    })
};

const registerEventHandlerOnPointClick = () => {
    // Event handler for clicking on track points
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function (click) {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entityId = pickedObject.id;
            if (entityId instanceof Cesium.Entity) {
                const track = state.tracks.find(track => track.id === entityId.trackid);
                scrollToTrack(track.id);
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

const handleTrackChecked = (state, setState, trackid) => {
    const copy_tracks = [...state['tracks']];
    const index = copy_tracks.findIndex(track => track.id === trackid)
    const target_track = copy_tracks[index];
    target_track.show = !target_track.show;
    setState({ tracks: copy_tracks });
    showTracks(copy_tracks);
    if (target_track.show) {
        zoomToTracks([target_track]);
    }
};

const handleDateChange = (newDate) => {
    const date = dayjs(newDate);
    loadTracks({ date: date }, setState);
}

const World = () => {
    const cesiumContainerRef = React.useRef(null);
    [state, setState] = React.useState({
        tracks: [],
        date: dayjs(),
    });

    React.useEffect(() => {
        initializeCesium(cesiumContainerRef);
        loadTracks(state, setState);
        registerEventHandlerOnPointClick();

        return () => {
            viewer.destroy();
        };
    }, []);

    return (
        <div ref={cesiumContainerRef} id="world">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <ControlPanel date={state['date']} onDateChange={(newDate) => handleDateChange(newDate)} tracks={state['tracks']} onTrackChecked={(trackid) => { handleTrackChecked(state, setState, trackid) }} />
            </LocalizationProvider>
        </div>
    );
};

export default World;