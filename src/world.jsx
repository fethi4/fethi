import React from "react";
import { CameraFlyToBoundingSphere, Viewer, ScreenSpaceEventHandler, ScreenSpaceEvent, Scene, Globe } from "resium";
import { Terrain, BoundingSphere, Entity, ScreenSpaceEventType } from "cesium";
import { Tracks } from "./track";
import { TrackInfo } from "./trackinfo";
import { ControlPanel } from "./controlpanel";
import { parseIgc } from "./igc";
import { Timeline } from "./timeline";
import "./world.css";

class World extends React.Component {
    #BASE_URL = "http://localhost:5173/tracks/";
    #terrain = Terrain.fromWorldTerrain();
    #igcs = [
        "2696raichou.igc",
        "Chousan.igc",
        "Hken.igc",
        "Kengo.igc",
        "Kenzaki.igc",
        "Mickey3713.igc",
        "MiyaChan.igc",
        "NAKAJ.igc",
        "STetsu.igc",
        "TETSU1.igc",
        "aoisora.igc",
        "atusi2015.igc",
        "fujidan24.igc",
        "h10016.igc",
        "hirof2.igc",
        "horisan2.igc",
        "kimura.igc",
        "kpolulani.igc",
        "kumakatsu.igc",
        "nabekatsu.igc",
        "nabekiyo.igc",
        "nagaii.igc",
        "nakatetsu.igc",
        "okd.igc",
        "paramori.igc",
        "pina.igc",
        "sayurin.igc",
        "shibu.igc",
        "sugiyan.igc",
        "taicho.igc",
        "tmai24.igc",
    ];

    constructor() {
        super();
        this.state = {
            tracks: new Array(),
            track_for_trackinfo: undefined,
            trackinfo_position: undefined,
            trackpointindex: 0,
        };
    }

    componentDidMount() {
        let tracks = new Array();
        this.#igcs.forEach(igcName => {
            let http = new XMLHttpRequest();
            http.open('GET', this.#BASE_URL + igcName, true);
            http.onreadystatechange = () => {
                if (http.readyState === 4 && http.status === 200) {
                    const track = parseIgc(igcName, http.responseText);
                    tracks.push(track);
                    this.setState({ tracks: tracks });
                }
            }
            http.send();
        });
    }

    handleChange(trackid) {
        const tracks = this.state.tracks;
        const index = tracks.findIndex(track => track.id === trackid)
        tracks[index].show = !tracks[index].show;
        this.setState({ tracks: tracks });
    }

    handleMouseOverOnTrack = e => {
        const picked = this.viewerComponent.cesiumElement.scene.pick(e.endPosition);
        const id = picked ? picked.id || picked.primitive.id : null;
        if (picked && id instanceof Entity && id.trackid !== undefined) {
            this.setState({
                track_for_trackinfo: this.state.tracks.find(track => track.id === id.trackid),
                trackinfo_position: { x: e.endPosition.x + 3, y: e.endPosition.y + 3 },
                trackpointindex: id.trackpointindex,
            });
        }
    }

    handleClickOnViewer = e => {
        this.setState({
            track_for_trackinfo: undefined,
            trackinfo_position: undefined,
            trackpointindex: 0,
        });
    }

    handleTrackInfoClose = () => {
        this.setState({
            track_for_trackinfo: undefined,
            trackinfo_position: undefined,
        });
    }

    render() {
        let flyto = <div></div>;
        let cartesians = new Array();
        if (this.state.tracks.length > 0) {
            this.state.tracks.forEach(track => cartesians.push(...track.cartesians));
            flyto = <CameraFlyToBoundingSphere once={true} duration={3} boundingSphere={BoundingSphere.fromPoints(cartesians)} />;
        }
        const dummyCredit = document.createElement("div");
        return (
            <Viewer id="world"
                ref={ref => { this.viewerComponent = ref }}
                terrain={this.#terrain}
                timeline={false}
                animation={false} >
                <Scene>
                    <Globe depthTestAgainstTerrain={true} />
                </Scene>
                <ControlPanel tracks={this.state.tracks} onChange={(i) => { this.handleChange(i) }} />
                <Tracks tracks={this.state.tracks} onMouseOver={this.handleMouseOverOnTrack} />
                {flyto}
                <ScreenSpaceEventHandler>
                    <ScreenSpaceEvent action={this.handleMouseOverOnTrack} type={ScreenSpaceEventType.MOUSE_MOVE} />
                    <ScreenSpaceEvent action={this.handleClickOnViewer} type={ScreenSpaceEventType.LEFT_CLICK} />
                </ScreenSpaceEventHandler>
                <TrackInfo track={this.state.track_for_trackinfo}
                    trackpointindex={this.state.trackpointindex}
                    position={this.state.trackinfo_position}
                    onChange={(i) => { this.handleChange(i) }}
                    onCloseClick={this.handleTrackInfoClose} />
            </Viewer>
        );
    }
}

export default World;