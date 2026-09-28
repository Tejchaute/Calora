import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingMotionProvider, RevealGroup, RevealItem } from './LandingMotion';

test('landing motion SSR is visible and contains no initial motion styles', () => {
    const html = renderToStaticMarkup(
        <LandingMotionProvider>
            <RevealGroup className="group">
                <RevealItem className="item">Visible content</RevealItem>
            </RevealGroup>
        </LandingMotionProvider>,
    );

    assert.match(html, /Visible content/);
    assert.match(html, /class="group"/);
    assert.match(html, /class="item"/);
    assert.doesNotMatch(html, /opacity:0/);
    assert.doesNotMatch(html, /translateY/);
    assert.doesNotMatch(html, /transform:/);
});
