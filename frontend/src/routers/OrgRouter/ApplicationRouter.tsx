import { useAuthContext } from '@authentication/AuthContext';
import KeyboardShortcutsEducation from '@components/KeyboardShortcutsEducation/KeyboardShortcutsEducation';
import AlertsRouter from '@pages/Alerts/AlertsRouter';
import DashboardsRouter from '@pages/Dashboards/DashboardsRouter';
import IntegrationsPage from '@pages/IntegrationsPage/IntegrationsPage';
import useLocalStorage from '@rehooks/local-storage';
import { useParams } from '@util/react-router/useParams';
import { FieldArrayParam } from '@util/url/params';
import _ from 'lodash';
import React, { Suspense, useEffect, useState } from 'react';
import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';
import {
    ArrayParam,
    BooleanParam,
    JsonParam,
    StringParam,
    useQueryParam,
    useQueryParams,
} from 'use-query-params';

const Buttons = React.lazy(() => import('../../pages/Buttons/Buttons'));
import ErrorPage from '../../pages/Error/ErrorPage';
import HomePage from '../../pages/Home/HomePage';
import Player from '../../pages/Player/PlayerPage';
import { EmptySessionsSearchParams } from '../../pages/Sessions/EmptySessionsSearchParams';
import {
    SearchContextProvider,
    SearchParams,
} from '../../pages/Sessions/SearchContext/SearchContext';
import SetupPage from '../../pages/Setup/SetupPage';
import ProjectSettings from '../../pages/WorkspaceSettings/WorkspaceSettings';

interface Props {
    integrated: boolean;
}

const ApplicationRouter = ({ integrated }: Props) => {
    const { project_id } = useParams<{ project_id: string }>();
    const [segmentName, setSegmentName] = useState<string | null>(null);
    const [showStarredSessions, setShowStarredSessions] = useState<boolean>(
        false
    );
    const [searchParams, setSearchParams] = useState<SearchParams>(
        EmptySessionsSearchParams
    );
    const [selectedSegment, setSelectedSegment] = useLocalStorage<
        { value: string; id: string } | undefined
    >(
        `highlightSegmentPickerForPlayerSelectedSegmentId-${project_id}`,
        undefined
    );

    const [searchQuery, setSearchQuery] = useState('');

    const [
        searchParamsToUrlParams,
        setSearchParamsToUrlParams,
    ] = useQueryParams({
        user_properties: FieldArrayParam,
        identified: BooleanParam,
        browser: StringParam,
        date_range: JsonParam,
        excluded_properties: FieldArrayParam,
        hide_viewed: BooleanParam,
        length_range: JsonParam,
        os: StringParam,
        referrer: StringParam,
        track_properties: FieldArrayParam,
        excluded_track_properties: FieldArrayParam,
        visited_url: StringParam,
        first_time: BooleanParam,
        device_id: StringParam,
        show_live_sessions: BooleanParam,
        environments: ArrayParam,
        app_versions: ArrayParam,
    });
    const [activeSegmentUrlParam, setActiveSegmentUrlParam] = useQueryParam(
        'segment',
        JsonParam
    );

    const [queryBuilderState, setQueryBuilderState] = useQueryParam(
        'query',
        JsonParam
    );

    const [existingParams, setExistingParams] = useState<SearchParams>(
        EmptySessionsSearchParams
    );

    const { isLoggedIn } = useAuthContext();

    const sessionsMatch = useRouteMatch('/:project_id/sessions');

    useEffect(() => {
        const areAnySearchParamsSet = !_.isEqual(
            EmptySessionsSearchParams,
            searchParams
        );

        // Handles the case where the user is loading the page from a link shared from another user that has search params in the URL.
        if (!segmentName && areAnySearchParamsSet) {
            // `undefined` values will not be persisted to the URL.
            // Because of that, we only want to change the values from `undefined`
            // to the actual value when the value is different to the empty state.
            const searchParamsToReflectInUrl = { ...InitialSearchParamsForUrl };
            Object.keys(searchParams).forEach((key) => {
                // @ts-expect-error
                const currentSearchParam = searchParams[key];
                // @ts-expect-error
                const emptySearchParam = EmptySessionsSearchParams[key];
                if (Array.isArray(currentSearchParam)) {
                    if (currentSearchParam.length !== emptySearchParam.length) {
                        // @ts-expect-error
                        searchParamsToReflectInUrl[key] = currentSearchParam;
                    }
                } else if (currentSearchParam !== emptySearchParam) {
                    // @ts-expect-error
                    searchParamsToReflectInUrl[key] = currentSearchParam;
                }
            });

            setSearchParamsToUrlParams({
                ...searchParamsToReflectInUrl,
            });
        }
    }, [setSearchParamsToUrlParams, searchParams, segmentName]);

    useEffect(() => {
        if (!_.isEqual(InitialSearchParamsForUrl, searchParamsToUrlParams)) {
            setSearchParams(searchParamsToUrlParams as SearchParams);
        }
        // We only want to run this on mount (i.e. when the page first loads).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Session Segment Deep Linking
    useEffect(() => {
        // Only this effect on the sessions page
        if (!sessionsMatch) {
            return;
        }

        if (selectedSegment && selectedSegment.id && selectedSegment.value) {
            if (!_.isEqual(activeSegmentUrlParam, selectedSegment)) {
                setActiveSegmentUrlParam(selectedSegment, 'replace');
            }
        } else if (activeSegmentUrlParam !== undefined) {
            setActiveSegmentUrlParam(undefined, 'replace');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSegment, sessionsMatch, setActiveSegmentUrlParam]);

    useEffect(() => {
        if (activeSegmentUrlParam) {
            setSelectedSegment(activeSegmentUrlParam);
        }
        // We only want to run this on mount (i.e. when the page first loads).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SearchContextProvider
            value={{
                searchParams,
                setSearchParams,
                existingParams,
                setExistingParams,
                segmentName,
                setSegmentName,
                showStarredSessions,
                setShowStarredSessions,
                selectedSegment,
                setSelectedSegment,
                searchQuery,
                setSearchQuery,
                queryBuilderState,
                setQueryBuilderState,
            }}
        >
            <KeyboardShortcutsEducation />
            <Switch>
                {/* These two routes do not require login */}
                <Route path="/:project_id/sessions/:session_secure_id?" exact>
                    <Player integrated={integrated} />
                </Route>
                <Route path="/:project_id/errors/:error_secure_id?" exact>
                    <ErrorPage integrated={integrated} />
                </Route>
                {/* If not logged in and project id is numeric and nonzero, redirect to login */}
                {!isLoggedIn && (
                    <Route path="/:project_id([1-9]+[0-9]*)/*" exact>
                        <Redirect to="/" />
                    </Route>
                )}
                <Route path="/:project_id/settings">
                    <ProjectSettings />
                </Route>
                <Route path="/:project_id/alerts">
                    <AlertsRouter />
                </Route>
                <Route path="/:project_id/dashboards">
                    <DashboardsRouter />
                </Route>
                <Route path="/:project_id/setup">
                    <SetupPage integrated={integrated} />
                </Route>
                <Route path="/:project_id/integrations">
                    <IntegrationsPage />
                </Route>
                <Route path="/:project_id/buttons">
                    <Suspense fallback={null}>
                        <Buttons />
                    </Suspense>
                </Route>
                <Route path="/:project_id/home">
                    <HomePage />
                </Route>
                <Route path="/:project_id">
                    {integrated ? (
                        <Redirect to={`/${project_id}/home`} />
                    ) : (
                        <Redirect to={`/${project_id}/setup`} />
                    )}
                </Route>
            </Switch>
        </SearchContextProvider>
    );
};

export default ApplicationRouter;

const InitialSearchParamsForUrl = {
    browser: undefined,
    date_range: undefined,
    device_id: undefined,
    excluded_properties: undefined,
    excluded_track_properties: undefined,
    first_time: undefined,
    hide_viewed: undefined,
    identified: undefined,
    length_range: undefined,
    os: undefined,
    referrer: undefined,
    track_properties: undefined,
    user_properties: undefined,
    visited_url: undefined,
    show_live_sessions: undefined,
    environments: undefined,
    app_versions: undefined,
};
