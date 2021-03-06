/*
Copyright 2016 First People's Cultural Council

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, {Component, PropTypes} from 'react';
import Immutable, { List, Map } from 'immutable';

import classNames from 'classnames';
import provide from 'react-redux-provide';
import selectn from 'selectn';

import t from 'tcomb-form';

import fields from 'models/schemas/filter-fields';
import options from 'models/schemas/filter-options';

import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';

import IconButton from 'material-ui/lib/icon-button';

import SelectField from 'material-ui/lib/select-field';
import MenuItem from 'material-ui/lib/menus/menu-item';

import PromiseWrapper from 'views/components/Document/PromiseWrapper';

import ProviderHelpers from 'common/ProviderHelpers';
import UIHelpers from 'common/UIHelpers';
import StringHelpers from 'common/StringHelpers';
import FormHelpers from 'common/FormHelpers';
import AnalyticsHelpers from 'common/AnalyticsHelpers';

import SearchResultTile from './tile';

import DataListView from 'views/pages/explore/dialect/learn/base/data-list-view';
import DocumentListView from 'views/components/Document/DocumentListView';

import withToggle from 'views/hoc/view/with-toggle';
import IntlService from "views/services/intl";

const FiltersWithToggle = withToggle();
const intl = IntlService.instance;

@provide
export default class Search extends DataListView {

  static defaultProps = {
    DISABLED_SORT_COLS: ['state', 'fv-word:categories', 'related_audio', 'related_pictures'],
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    DEFAULT_LANGUAGE: 'english',
    DEFAULT_SORT_COL: 'fv:custom_order',
    DEFAULT_SORT_TYPE: 'asc',
    dialect: null,
    filter: new Map(),
    gridListView: false
  }

  static propTypes = {
    properties: PropTypes.object.isRequired,
    windowPath: PropTypes.string.isRequired,
    splitWindowPath: PropTypes.array.isRequired,
    pushWindowPath: PropTypes.func.isRequired,
	replaceWindowPath: PropTypes.func.isRequired,
    computeLogin: PropTypes.object.isRequired, 
    fetchDialect2: PropTypes.func.isRequired,
    computeDialect2: PropTypes.object.isRequired,
    dialect: PropTypes.object,
	searchDocuments: PropTypes.func.isRequired,
	computeSearchDocuments: PropTypes.object.isRequired,
    routeParams: PropTypes.object.isRequired,
    filter: PropTypes.object,
    data: PropTypes.string,
    gridListView: PropTypes.bool,
    action: PropTypes.func,

    DISABLED_SORT_COLS: PropTypes.array,
    DEFAULT_PAGE: PropTypes.number,
    DEFAULT_PAGE_SIZE: PropTypes.number,
    DEFAULT_SORT_COL: PropTypes.string,
    DEFAULT_SORT_TYPE: PropTypes.string
  };

	constructor(props, context) {
		super(props, context);

		this.state = {
			pageInfo: {
				page: props.DEFAULT_PAGE,
				pageSize: props.DEFAULT_PAGE_SIZE
			},
			formValue: { searchTerm: props.routeParams.searchTerm, documentTypes: ['FVWord', 'FVPhrase', 'FVBook', 'FVPortal'] },
			defaultFormValue: { searchTerm: "", documentTypes: ['FVWord', 'FVPhrase', 'FVBook', 'FVPortal'] },
			preparedFilters: null
		};
			
	  this.state.queryParam = this._computeQueryParam();
	  this.state.queryPath = this._getQueryPath();	

		// Bind methods to 'this'
		['_handleRefetch', '_onSearchSaveForm', '_computeQueryParam', '_getQueryPath',  '_onEntryNavigateRequest', '_onReset'].forEach( (method => this[method] = this[method].bind(this)) ); 

	}

	fetchData(newProps = this.props) {
		this._fetchListViewData(newProps, newProps.DEFAULT_PAGE, newProps.DEFAULT_PAGE_SIZE, newProps.DEFAULT_SORT_TYPE, newProps.DEFAULT_SORT_COL);
	}

	_fetchListViewData(props = this.props, pageIndex, pageSize, sortOrder, sortBy, formValue = this.state.formValue) {

		if (props.routeParams.searchTerm && props.routeParams.searchTerm != '') {
			let documentTypeFilter = '\'' + formValue.documentTypes.join('\',\'') + '\'';
			props.searchDocuments(this._getQueryPath(props),
			((props.routeParams.area == 'sections') ? ' AND ecm:isLatestVersion = 1' : ' ') + 
			// Exclude Demo from search
			((!props.routeParams.dialect_path) ? ' AND ecm:ancestorId <> \'b482d9df-e71b-40b5-9632-79b1fc2782d7\' AND ecm:ancestorId <> \'732c2ef6-19d3-45a8-97e7-b6cff7d84909\' ' : ' ') + 
			' AND ecm:primaryType IN (' + documentTypeFilter + ')' +      
			' AND ecm:fulltext = \'*' + StringHelpers.clean(props.routeParams.searchTerm, 'fulltext') + '*\'' +    
			// More specific: ' AND (ecm:fulltext_description = \'' + props.routeParams.searchTerm + '\' OR ecm:fulltext_title = \'' + props.routeParams.searchTerm + '\')' +    
			'&currentPageIndex=' + (pageIndex - 1) + 
			'&pageSize=' + pageSize + 
			'&sortBy=ecm:fulltextScore'
			);

			// TODO: Update with path after filter.
		}
	}

	_onSearchSaveForm(e) {

		// Prevent default behaviour
		if (e) {
			e.preventDefault();
		}

		//let form = this.refs["search_form"];
		let form = this.refs.search_form;

		let properties = FormHelpers.getProperties(form);

		if (Object.keys(properties).length != 0) {
			this.setState({
				formValue: properties
			});

			// If search term didn't change, but facets did - update results
			if (properties.searchTerm == this.props.routeParams.searchTerm && properties != this.state.formValue) {
				this._fetchListViewData(this.props, this.state.pageInfo.page, this.state.pageInfo.pageSize, this.props.DEFAULT_SORT_TYPE, this.props.DEFAULT_SORT_COL, properties);
			}

			this.props.replaceWindowPath('/explore' + this._getQueryPath() + '/search/' + properties.searchTerm); 
		}
	}

  _onEntryNavigateRequest(path) {
    this.props.pushWindowPath('/' + this.props.routeParams.theme + path);
  }  
  
	_getQueryPath(props = this.props) {
		return props.routeParams.dialect_path || props.routeParams.language_path || props.routeParams.language_family_path || '/' + props.properties.domain + '/' + (props.routeParams.area || 'sections') + '/Data';

	}

  _computeQueryParam() {
	  let path = "/" + this.props.splitWindowPath.slice(1, this.props.splitWindowPath.length).join('/');
	  let lastPathSegment = this.props.splitWindowPath[this.props.splitWindowPath.length - 1];
	  
	  let queryParam = "";
	  if(lastPathSegment != "search") {
		  queryParam = lastPathSegment;
		  //console.log("queryParam:" + queryParam);		  
	  }
	  
	  return queryParam;
  }  

  _onReset(event, props = this.props) {
	
			// Reset all controlled inputs
			let inputs = selectn('refs.input.refs', this.refs["search_form"]);
	
			for (let inputKey in inputs) {
				if (typeof inputs[inputKey].reset === 'function') {
					inputs[inputKey].reset();
				}
			}
	
			this.setState({
				formValue: this.state.defaultFormValue || null
			});
	}


  componentDidUpdate(prevProps, prevState) {

	  const computeSearchDocuments = ProviderHelpers.getEntry(this.props.computeSearchDocuments, this._getQueryPath());

	  if (selectn('response.totalSize', computeSearchDocuments) != undefined) {
		// Track search event
		AnalyticsHelpers.trackSiteSearch({
			keyword: this.props.routeParams.searchTerm,
			category: false,
			results: selectn("response.totalSize", computeSearchDocuments)
		});
	  }
  }

  render() {

    const computeEntities = Immutable.fromJS([{
      'id': this._getQueryPath(),
      'entity': this.props.computeSearchDocuments
    }]);

    const computeSearchDocuments = ProviderHelpers.getEntry(this.props.computeSearchDocuments, this._getQueryPath());

	let _onEntryNavigateRequest = this._onEntryNavigateRequest;
	let searchTerm = this.props.routeParams.searchTerm;

	let SearchResultTileWithProps = React.createClass({
		render: function() {
			return React.createElement(SearchResultTile, {searchTerm: searchTerm, action: _onEntryNavigateRequest, ...this.props });
		}
	});

    return <div>

            <div className="row">
                <div className={classNames('col-xs-12', 'col-md-3')}>
                    <div className="col-xs-12">
                        <form onSubmit={this._onSearchSaveForm}>
                            <FiltersWithToggle
                                label={intl.trans('views.pages.search.filter_items', 'Filter items', 'first')}
                                mobileOnly={true}>
                                <t.form.Form
                                    ref="search_form"
                                    value={Object.assign({}, this.state.formValue, {searchTerm: this.props.routeParams.searchTerm})}
                                    type={t.struct(selectn('Search', fields))}
                                    options={selectn('Search', options)}
                                />
                                <RaisedButton
                                    onTouchTap={this._onReset}
                                    label={intl.trans('reset', 'Reset', 'first')}
                                    primary={true}/> &nbsp;
                                <RaisedButton
                                    type="submit"
                                    label={intl.trans('search', 'Search', 'first')}
                                    primary={true}/>
                            </FiltersWithToggle>
                        </form>
                    </div>
                </div>
                <div className={classNames('col-xs-12', 'col-md-6')} style={{borderLeft: '5px solid #f7f7f7'}}>
                    <h1>{intl.trans('search_results', 'Search results', 'first')} - {this.props.routeParams.searchTerm}</h1>

					<PromiseWrapper renderOnError={true} computeEntities={computeEntities}>

						{(() => {
							if (selectn('response.entries', computeSearchDocuments)) {

								return <DocumentListView
											objectDescriptions="results" 
											type="Document"
											data={computeSearchDocuments}
											gridCols={1}
											gridListView={true}
											gridListTile={SearchResultTileWithProps}
											gridViewProps={{cellHeight: 170, style: {overflowY: 'hidden', margin:'0 0 30px 0'}}}
											refetcher={this._handleRefetch}
											onSortChange={this._handleSortChange}
											onSelectionChange={this._onEntryNavigateRequest}
											page={this.state.pageInfo.page}
											pageSize={this.state.pageInfo.pageSize}
											onColumnOrderChange={this._handleColumnOrderChange}
											usePrevResponse={true}
											className="browseDataGrid" />;
							}
						})()}

					</PromiseWrapper>

				</div>
			</div>

		</div>;
  }
}