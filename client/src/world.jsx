import React from "react";
import * as Cesium from "cesium";
import axios from "axios";
import { ControlPanel, scrollToTrack } from "./controlpanel";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs';
import { parseTrackJson, dbscanTracks } from "./track";
import { Dragger } from "./dragger";
import { ControlPanelToggle } from "./controlpaneltoggle";
import "./world.css";

let viewer = undefined;
let state = undefined;
let setState = undefined;
let trackGroups = Array();
let media = undefined;

const initializeCesium = (cesiumContainerRef) => {
    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNjMxN2Y3Ni04YWU3LTQwNjctYmYyNC05Yjc4MTljOTY3OGYiLCJpZCI6MTY5NTkxLCJpYXQiOjE2OTYyNDYyMTB9.CYkH9qKRpMU0kzQWkjXuvqgr-09nICUdta83AZIxAy8";
    viewer = new Cesium.Viewer(cesiumContainerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        terrainShadows: Cesium.ShadowMode.DISABLED,
    });
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.fog = new Cesium.Fog({
        enabled: true,
        density: 0.0005,
        minimumBrightness: 1.0,
    });
    document.getElementsByClassName('cesium-viewer-bottom')[0].remove();
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
    const tracksurl = `${import.meta.env.VITE_API_URL}/tracks?date=`;
    axios({ method: "get", url: `${tracksurl}${date.format('YYYY-MM-DD')}`, responseType: "json" }).then(response => {
        let tracks = response.data.map(trackjson => {
            return parseTrackJson(trackjson);
        })
        // filter tracks less than 5 minutes
        tracks = tracks.filter(track => track !== undefined && track.duration() > 5);
        trackGroups = dbscanTracks(tracks);
        trackGroups.forEach(group => group.initializeTrackGroupEntity(viewer));
        setState({ ...state, tracks: tracks });
        initializeTracks(tracks);
        zoomToTracks(tracks);
    }).catch(error => {
        console.error(error);
    });
}

const initializeTracks = (tracks) => {
    tracks.forEach(track => {
        track.initializeTrackEntity(viewer, media);
    });
};

const registerEventHandlerOnPointClick = () => {
    // Event handler for clicking on track points
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function (click) {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entityId = pickedObject.id;
            if (entityId instanceof Cesium.Entity) {
                if ('trackid' in entityId) {
                    const track = state.tracks.find(track => track.id === entityId.trackid);
                    if (!track.isShowingTrackLine()) {
                        handleTrackClick(state, track.id);
                    }
                    setTimeout(() => scrollToTrack(track.id), 100);
                } else if ('groupid' in entityId) {
                    const group = trackGroups.find(group => group.groupid === entityId.groupid);
                    group.zoomToTrackGroup(viewer);
                    viewer.selectedEntity = undefined;
                } else {
                    viewer.selectedEntity = undefined;
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

const registerEventListenerOnCameraMove = () => {
    viewer.camera.changed.addEventListener(() => {
        const cameraAltitude = viewer.scene.camera.positionCartographic.height;
        if (cameraAltitude > 70000) {
            trackGroups.forEach(group => group.showTrackGroup(true));
            state['tracks'].forEach(track => {
                track.fadeOut();
            });
        } else {
            trackGroups.forEach(group => group.showTrackGroup(false));
            state['tracks'].forEach(track => {
                track.fadeIn();
            });
        }
    });
}

const handleTrackClick = (state, trackid) => {
    const copy_tracks = [...state['tracks']];
    const index = copy_tracks.findIndex(track => track.id === trackid)
    const target_track = copy_tracks[index];
    const show = !target_track.isShowingTrackLine();
    target_track.showTrackLine(show);
    setState({ ...state, tracks: copy_tracks });
    if (show) {
        zoomToTracks([target_track]);
    }
};

const handleDateChange = (newDate) => {
    viewer.entities.removeAll();
    const date = dayjs(newDate);
    loadTracks({ ...state, date: date }, setState);
}

const judgeMedia = () => {
    const clientWidth = document.documentElement.clientWidth;
    if (clientWidth <= 752) {
        return { isMobile: true, isTablet: false, isPc: false };
    } else if (clientWidth <= 1122) {
        return { isMobile: false, isTablet: true, isPc: false };
    }
    return { isMobile: false, isTablet: false, isPc: true };
}

const World = () => {
    const cesiumContainerRef = React.useRef(null);
    media = judgeMedia();

    [state, setState] = React.useState({
        tracks: [],
        date: dayjs(),
        controlPanelSize: 0,
        prevControlPanelSize: media.isPc ?
            document.documentElement.clientWidth * 0.4 : document.documentElement.clientWidth * 0.8,
    });

    React.useEffect(() => {
        initializeCesium(cesiumContainerRef);
        loadTracks(state, setState);
        registerEventHandlerOnPointClick();
        registerEventListenerOnCameraMove();

        return () => {
            viewer.destroy();
        };
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div id='main'>
                <div
                    ref={cesiumContainerRef}
                    id="cesium" />
                <ControlPanel
                    date={state['date']}
                    onDateChange={(newDate) => handleDateChange(newDate)}
                    tracks={state['tracks']}
                    onTrackClicked={(trackid) => { handleTrackClick(state, trackid) }}
                    controlPanelSize={state.controlPanelSize}
                    media={media} />
                <Dragger
                    controlPanelSize={state.controlPanelSize}
                    setControlPanelSize={(width) => setState({ ...state, controlPanelSize: width })} />
                <ControlPanelToggle
                    state={state}
                    setState={setState} />
            </div>
        </LocalizationProvider >
    );
};

export default World;