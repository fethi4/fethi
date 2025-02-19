import React from 'react';
import dayjs from 'dayjs';
import { ControlPanel } from "../../controlpanel";
import { ScatterControlPanel } from "./controlpanel/scattercontrolpanel";
import { TrackGroupSelection } from './trackGroupSelection';
import { TracksLoadingDialog } from './tracksloadingdialog';
import { TrackPointStatsOverlay } from './statsoverlay/trackpointstatsoverlay';
import { TrackPoint } from './trackpoint';
import { SCATTER_MODE } from '../mode';

export const ScatterMode = ({ state, setState }) => {
    const [scatterState, setScatterState] = React.useState({
        order: 'asc',
        orderBy: 'starttime',
        loading: true,
        selectedTracks: new Set(),
        selectedTrackGroups: new TrackGroupSelection(),
        selectedTrackPoint: new TrackPoint(),
        tracksInPerspective: [],
        trackGroupsInPerspective: [],
    });

    if (state.mode !== SCATTER_MODE) {
        return null;
    }

    return (
        <div>
            <TrackPointStatsOverlay scatterState={scatterState} setScatterState={setScatterState} />
            <ControlPanel state={state} setState={setState}>
                <ScatterControlPanel state={state} setState={setState} scatterState={scatterState} setScatterState={setScatterState} />
            </ControlPanel>
            <TracksLoadingDialog open={scatterState.loading} />
        </div>
    );
}