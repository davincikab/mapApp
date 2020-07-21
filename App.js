import React, {useState, useEffect} from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, Text, View, ActivityIndicator,Image, TouchableOpacity, Animated } from 'react-native';
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
firebase.initializeApp(firebaseConfig);

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
              options={{title:"Map"}}
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
    // const descriptionInfo = firebaseApp.database().ref().child(descriptionUrl);
    const descriptionInfo = database().ref(descriptionUrl);

    images.getDownloadURL()
    .then(url => {
      setImageUrl(url);
    })
    .catch(e=>{console.log(e);})

    descriptionInfo.on('value', (snap) => {
      console.log(snap.val());
       let element = snap.val();

       element = element.find(el => el.title == title);
       setDescription(element);
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
      data:[],
      allPoints:[],
      fadeAnim: new Animated.Value(0),
      activeMarkers:''
    };

    
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
          console.log(snap.val().features);
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
      let markerType = newData.map(ft => ft.properties.marker_type);

      console.log(...new Set(markerType));
      newData = newData.filter(feature => feature.properties.marker_type == el);

      this.fadeOut();
      this.setState({
        data:newData,
        activeMarkers:el
      });

      this.fadeIn();
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

  render() {
    return (        
        <MapboxGL.MapView
          ref={(c) => (this._map = c)}
          onDidFinishLoadingMap={this.onDidFinishLoadingMap}
          onRegionDidChange={this.zoomend}
          style={styles.map}>
          <MapboxGL.Camera
            zoomLevel={1.5}
            centerCoordinate={[7.945162026843832, 19.295832786307415]}
            minZoomLevel={1.5}
          />

          {
            this.state.data.length == 0 ?
            <MapboxGL.MarkerView coordinate={this.state.coordinates[0]}>
              {/* <AnnotationContent title={'this is a marker view'} /> */}
            </MapboxGL.MarkerView> :
            <CreateMarkers fadeAnim={this.state.fadeAnim} data={this.state.data} navigation={this.props.navigation}/>
          }
        </MapboxGL.MapView>
    );
  }
}

const CreateMarkers = (props) => {

  // reroute 
  const onSelectedPoint = (event) => {
    props.navigation.navigate('Profile', {name:event.properties.title,  item:event})
  }

  return (
        props.data.map((data,key) => (
          <MapboxGL.MarkerView 
            key={key}
            coordinate={data.geometry.coordinates}
            anchor={{x: 0, y: 0}}
          >
            <AnnotationContent 
              key={key}
              title={data.properties.title} 
              onPress={() => onSelectedPoint(data)}
              imageUrl={data.properties.icon}
              fadeAnim={props.fadeAnim}
            />
          </MapboxGL.MarkerView>
        ) 
      )
  );
}

const AnnotationContent = (props) => {
  // load the image
  const [imageUrl, setImageUrl] = useState(null);

  const regexp =  /(\.\.\/\w{3}\/)(\w+.{2,})/i;
  let sourceFolder = props.imageUrl.match(regexp);

  console.log(sourceFolder[2]);
  let storageUrl = sourceFolder[2];

  useEffect(() => {
    const images = storage().ref(storageUrl);
  
    images.getDownloadURL()
    .then(url => {
      setImageUrl(url);
    })
    .catch(e=>{console.log(e);})

  }, []);

  return (
    <View style={{borderColor: 'black', borderWidth: 0, width: "auto"}}>

      <TouchableOpacity
        onPress={props.onPress}
        style={{
          // backgroundColor: 'blue',
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
    height:250
  },
  imgMarker:{
    width: 50,
    height: 50,
  }
});
