import React, {useState, useEffect} from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  StyleSheet, Text, View, ActivityIndicator,
  Image, TouchableOpacity, Animated, TextInput, 
  SafeAreaView, FlatList, Keyboard, KeyboardAvoidingView
} from 'react-native';
import MapboxGL from '@react-native-mapbox-gl/maps';

// import firebase from '@react-native-firebase/app';
import database, { firebase } from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';

// import 
var firebaseConfig = {
  apiKey: "AIzaSyD_sXm99oH-chplFORgWB1nBt27-ZVU5W4",
  authDomain: "workmap-3d193.firebaseapp.com",
  databaseURL: "https://workmap-3d193.firebaseio.com",
  projectId: "workmap-3d193",
  storageBucket: "workmap-3d193.appspot.com",
  messagingSenderId: "740084205858",
  appId: "1:740084205858:web:36c299f41d73e7ad61bd7b",
  measurementId: "G-M1J3JMM2G2"
};

// navigation stack
const Stack = createStackNavigator();

// Initialize Firebase
// firebase.initializeApp(firebaseConfig);

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Access Token
MapboxGL.setAccessToken(
  'pk.eyJ1IjoiZGF1ZGk5NyIsImEiOiJjanJtY3B1bjYwZ3F2NGFvOXZ1a29iMmp6In0.9ZdvuGInodgDk7cv-KlujA'
);

const dataSources = [
  {url:'cities', marker_type:"marker_cities", type:'cities', zoom:10},
  {url:'places', marker_type:"marker_places", type:'Places', zoom:13.5},
  {url:'countries',marker_type:"marker_countries", type:'Countries', zoom:5.1},
  {url:'continents',marker_type:"marker_continents", type:'Continent', zoom:1.5},
  {url:'region_country',marker_type:"marker_region_country", type:'Region Country', zoom:7.5},
  {url:'zone_continents' ,marker_type:"marker_zone_continents", type:'Zone Continents', zoom:3.5},
  {url:'zone_country', marker_type:"marker_zone_country", type:'Zone Country', zoom:6.5},
  {url:'zone_region',marker_type:"marker_zone_region", type:'Zone Region', zoom:8.5}
];
export default function() {
  return (
    <NavigationContainer> 
        <Stack.Navigator>
          <Stack.Screen 
              name="Map"
              component={MapPage}
              options={{
                title:"Map",
                headerShown:false,
              }}
            />

        
          <Stack.Screen 
            name="Profile"
            component={ProfilePage}
            options={({ route }) => ({ title: route.params.name })}
          />

        </Stack.Navigator>
    </NavigationContainer>
  );
}


const ProfilePage = (item) => {
  const title = item.route.params.item.properties.title;

  const regexp =  /(\.\.\/\w{3}\/)(\w+.{2,})/i;
  let sourceFolder = item.route.params.item.properties.icon.match(regexp);

  console.log(sourceFolder[2]);
  let storageUrl = sourceFolder[2];

  let descriptionUrl = item.route.params.item.properties.category + '_description';

  const [imageUrl, setImageUrl] = useState(null);
  const [description, setDescription] = useState({});

  useEffect(() => {
    const images = storage().ref(storageUrl);
    const descriptionInfo = database().ref(descriptionUrl);

    images.getDownloadURL()
    .then(url => {
      setImageUrl(url);
    })
    .catch(e=>{console.log(e);})

    descriptionInfo.on('value', (snap) => {
      console.log(snap.val());
       let element = snap.val();

       if(element) {
        element = element.find(el => el.title == title);
        setDescription(element);
       }
      
    });

  }, []);

  return (
    <View>
      {imageUrl ? 
        <Image
        style={styles.imgDesc}
        source={{
          uri: imageUrl,
        }}
      /> :
      <View style={{
        marginTop:10
      }}>
        <ActivityIndicator size="small" color="#0000ff" /> 
      </View>
      }
      <Text>  </Text>
      <View>
        { description.description &&
          <Text>
          {description.description}
        </Text>
        }
        
      </View>
      
    </View>
  );
}

// Map page
class MapPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      backgroundColor: 'blue',
      coordinates: [
        [-73.99155, 40.73581],
        [-73.99155, 40.73681],
      ],
      center:[7.945162026843832, 19.295832786307415],
      zoom:1,
      data:[],
      allPoints:[],
      fadeAnim: new Animated.Value(0),
      activeMarkers:'',
      value:'',
      searchBookmark:{},
      filterData:[]
    };

    this.searchInput = null;
    
  }

  fadeIn = () => {
    // Will change fadeAnim value to 1 in 5 seconds
    Animated.timing(this.state.fadeAnim, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true
    }).start();
  };

  fadeOut = () => {
    // Will change fadeAnim value to 0 in 5 seconds
    Animated.timing(this.state.fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true
    }).start();
  };

  getRef = () => database().ref();

  componentDidMount() {
    // fetch the data
    dataSources.forEach(dataSource => {

      let itemsRef = this.getRef().child(dataSource.url);

      itemsRef.on('value', (snap) => {   
          let items = snap.val().features;
          // console.log(snap.val().features);
          items.forEach(feature => {
            feature.properties.marker_type = dataSource.marker_type;
            feature.properties.category = dataSource.url;
            return feature;
          });

          this.setState((state) => ({
            allPoints:[...state.allPoints, ...items]
          }));

      });

    });
  }


  // toggle layers  
  toggleLayer = (el) => {
    console.log(el);
    if(el != this.state.activeMarkers) {
      // console.log(newData);
      
      var newData = this.state.allPoints;
      newData = newData.filter(feature => feature.properties.marker_type == el);

      this.fadeOut();
      this.setState({
        data:newData,
        activeMarkers:el
      });

      this.fadeIn();
    }
    
    // Update the bookmark
    if(this.state.searchBookmark.properties) {
      if(el != this.state.searchBookmark.properties.marker_type){
        this.setState({
          searchBookmark:{}
        });
      }
      
    }

  }

  // listen to zoomend event
  zoomend = (e) => {
    // update the data
    let zoom = e.properties.zoomLevel;
    switch (true) {
        case zoom <= 2.1:
            this.toggleLayer('marker_continents');
            break;
        case zoom > 2.1 && zoom <= 4.5:
            this.toggleLayer('marker_zone_continents');
            break;
        case zoom > 4.5 && zoom <= 5.7:
            this.toggleLayer('marker_countries');
            break;
        case zoom > 5.7 && zoom <= 7:
            this.toggleLayer('marker_zone_country');
            break;
        case zoom > 7 && zoom <= 8:
            this.toggleLayer('marker_region_country');
            break;
        case zoom > 8 && zoom <= 9.1:
            this.toggleLayer('marker_zone_region');
            break;
        case zoom > 9.1 && zoom <= 13:
            this.toggleLayer('marker_cities');
            break;
        case zoom > 13:
            this.toggleLayer('marker_places');
            break;
        default:
            break;
    }

  }

  onMapPress = (e) => {
    this.searchInput.blur();
    Keyboard.dismiss();
  }

  navigateToBookmarkDescription = (bookmark) => {
    this.props.navigation.navigate('Profile', {name:bookmark.properties.title,  item:bookmark});

    // reset bookmark
    this.setState({
      searchBookmark:{}
    });

  }

  zoomToBookMark = (item) => {
    console.log("Zoomed to bookmark: " + item.properties.title);
    Keyboard.dismiss();
    this.searchInput.blur();

    // create an Animated marker
    let zoom = dataSources.find(dt => { 
      if(dt.url == item.properties.category) {
        return dt;
      }
    });

    console.log("Zoom to:"+ item.properties);

    this.setState({
      searchBookmark:item,
      center:item.geometry.coordinates,
      zoom:zoom.zoom,
      filterData:[]    
    });

  
  }

  // list of results
  renderItem = ({item}) => {
    return (
        <View style={styles.item}>
          <TouchableOpacity
            onPress={() => this.zoomToBookMark(item)}
          >
            <Text>{item.properties.title}, {item.properties.category}</Text>
          </TouchableOpacity>   
        </View>
    );
  }

  onChangeText = (text) => {
    console.log(text);
    if(!text) {
      this.setState({
        filterData:[],
        value:''
      });

      return;
    }

    // filter all
    const allBookmarks = this.state.allPoints;

    let filterData = allBookmarks.map(bookmark => {
        if(bookmark.properties.title &&
          bookmark.properties.title.toLowerCase()
            .includes(text.toLowerCase())
        ) {

          return bookmark;
        }
    }).filter(ft=> ft);

    // slice data
    filterData = filterData.length > 5 ? filterData.slice(0,6) : filterData;

    console.log(filterData);
    // update the state
    this.setState({
      value:text,
      filterData:filterData
    });
  }

  onFocus = (e) => {
    console.log(e);
    this.onChangeText(this.state.value);
  }

  render() {
    const filterData = this.state.filterData;
    const searchBookmark = this.state.searchBookmark;

    console.log("SeARCH: "+ JSON.stringify(searchBookmark));
    return (        
        <>
        <View style={styles.searchControl}>
          <TextInput
            ref={(input) => (this.searchInput = input)}
            style={styles.textInput}
            onChangeText={text => this.onChangeText(text)}
            onFocus={e => this.onFocus(e)}
            value={this.state.value}
          />

          {filterData &&
            // <SafeAreaView style={styles.bookmarkList}>
              <FlatList 
                keyboardShouldPersistTaps={'handled'}
                style={styles.bookmarkList}
                data={filterData}
                renderItem={this.renderItem}
                keyExtractor={item => item.properties.title}
              />
            // </SafeAreaView>
          }
        </View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS == "ios" ? "padding" : "height"}
          style={{flex:1}}
          keyboardVerticalOffset={-115}
        >
        <MapboxGL.MapView
          key={"map"}
          ref={(c) => (this._map = c)}
          onDidFinishLoadingMap={this.onDidFinishLoadingMap}
          onRegionDidChange={this.zoomend}
          rotateEnabled={false}
          onPress={this.onMapPress}
          pitchEnabled={false}
          style={styles.map}
          >
          <MapboxGL.Camera
            zoomLevel={this.state.zoom}
            centerCoordinate={this.state.center}
            minZoomLevel={1.5}
          />

          {
            this.state.data.length == 0 ?
            <MapboxGL.MarkerView coordinate={this.state.coordinates[0]}>
            </MapboxGL.MarkerView> :
            <CreateMarkers fadeAnim={this.state.fadeAnim} data={this.state.data} navigation={this.props.navigation}/>
          }

          {
            searchBookmark.properties &&
            <MapboxGL.MarkerView 
              coordinate={searchBookmark.geometry.coordinates}  
              anchor={{x: 0, y: 0}}>
              <View style={{borderColor: 'black', borderWidth: 0, width: "auto"}}>
                <TouchableOpacity
                style={{
                  borderWidth:7,
                  borderColor: 'blue',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow:"hidden"
                }}
                onPress={() => this.navigateToBookmarkDescription(searchBookmark)}
                ></TouchableOpacity>
              </View>
            </MapboxGL.MarkerView> 
          }

        </MapboxGL.MapView>
        </KeyboardAvoidingView>
        </>
    );
  }
}

const CreateMarkers = (props) => {
  const data = props.data;

  // reroute 
  const onSelectedPoint = (event) => {
    props.navigation.navigate('Profile', {name:event.properties.title,  item:event})
  }

  return ( 
        data.map((data, key) => (
          <MapboxGL.MarkerView 
            key={key}
            coordinate={data.geometry.coordinates}
            anchor={{x: 0, y: 0}}
          >
            {data.properties.icon &&
            <AnnotationContent 
              key={key}
              title={data.properties.title} 
              onPress={() => onSelectedPoint(data)}
              imageUrl={data.properties.icon}
              fadeAnim={props.fadeAnim}
            />
            }
          </MapboxGL.MarkerView>
        ) 
      )
  );
}

const AnnotationContent = (props) => {
  // // load the image
  const [imageUrl, setImageUrl] = useState(null);

  const regexp =  /(\.\.\/\w{3}\/)(\w+.{2,})/i;
  let sourceFolder = props.imageUrl.match(regexp);

  console.log(sourceFolder[2]);
  let storageUrl = sourceFolder[2];

  useEffect(() => {
    let isSubscribed = true;
    const images = storage()
      .ref(storageUrl)
      .getDownloadURL();

    console.log(isSubscribed);

    images.then(url => {
        if(isSubscribed) {
          setImageUrl(url);
        }
      })
      .catch( e =>{
        console.log("Storage failed: " + storageUrl);
        setImageUrl('');
      });

    return function cleanup() {
      isSubscribed = false;
    }

  }, []);

  return (
    <View style={{borderColor: 'black', borderWidth: 0, width: "auto"}}>

      <TouchableOpacity
        onPress={props.onPress}
        style={{
          backgroundColor: 'blue',
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          overflow:"hidden"
        }}>
        <Animated.View
          style={[
            styles.fadingContainer,
            {
              opacity: props.fadeAnim // Bind opacity to animated value
            }
          ]}
        >

        {imageUrl && 
            <Image
                style={styles.imgMarker}
                source={{
                  uri: imageUrl,
                }}
              />     
          }
        </Animated.View>    
      </TouchableOpacity>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#f2f2f2',
    flex: 1,
  },
  listview: {
    flex: 1,
  },
  li: {
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderColor: 'transparent',
    borderWidth: 1,
    paddingLeft: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  liContainer: {
    flex: 2,
  },
  liText: {
    color: '#333',
    fontSize: 16,
    paddingVertical:1
  },
  navbar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderColor: 'transparent',
    borderWidth: 1,
    justifyContent: 'center',
    height: 44,
    flexDirection: 'row'
  },
  navbarTitle: {
    color: '#444',
    fontSize: 16,
    fontWeight: "500"
  },
  statusbar: {
    backgroundColor: '#fff',
    height: 22,
  },
  center: {
    textAlign: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  action: {
    backgroundColor: "#ff0000",
    borderColor: 'transparent',
    borderWidth: 1,
    paddingLeft: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  imgDesc: {
    width: "100%",
    height: 150,
  },
  map:{
    flex:1,
    // height:250,
    top:0,
    bottom:0,
    left:0,
    right:0,
    zIndex:0,
    position:'absolute'
  },
  imgMarker:{
    width: 50,
    height: 50,
  },
  searchControl:{
    position:"absolute",
    top:10,
    right:0,
    left:0,
    zIndex:1,
    paddingHorizontal:5,
    marginHorizontal:20,
    backgroundColor: 'transparent'
  },
  textInput:{
    backgroundColor:'#fff',
    height: 40, 
    borderColor: 'gray', 
    borderWidth: 0, 
    marginHorizontal:10,
    shadowColor:'gray',
    shadowOffset:{width:0, height:3},
    marginTop:10,
    borderRadius:20,
    paddingHorizontal:10,
    fontSize:15
  },
  bookmarkList:{
    marginTop:10,
    backgroundColor:'transparent'
  },
  item:{
    backgroundColor:"#fff",
    borderTopColor:"#ddd",
    borderTopWidth:1,
    paddingVertical:4,
    paddingHorizontal:5,
    marginHorizontal:10,
    fontSize:15
  }
});
