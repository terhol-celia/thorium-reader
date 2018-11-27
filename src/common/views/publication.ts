import { CustomCover } from "readium-desktop/common/models/custom-cover";

export interface CoverView {
    url: string;
}

export interface CustomCoverView {
    topColor: string;
    bottomColor: string;
}

export interface PublicationView {
    identifier: string;
    title: string;
    authors: string[];
    editor?: string;
    description?: string;
    tags?: string[];
    languages?: string[];
    publishedAt?: number;
    cover?: CoverView;
    customCover?: CustomCoverView;
}
